import { Parser } from "acorn";
import jsx from "acorn-jsx";
import { ALLOWED_PACKAGES, ENTRY_FILE, NAVIGATION_PEERS, PRELOADED_PACKAGES } from "./constants";

const JsxParser = Parser.extend(jsx());

/** Returns a readable syntax error for JS/JSX source, or null when it parses. */
export function syntaxError(code: string): string | null {
  try {
    JsxParser.parse(code, { ecmaVersion: "latest", sourceType: "module", locations: true });
    return null;
  } catch (err) {
    const e = err as Error & { loc?: { line: number; column: number } };
    const where = e.loc ? ` at line ${e.loc.line}, column ${e.loc.column + 1}` : "";
    return `Syntax error${where}: ${e.message.replace(/\s*\(\d+:\d+\)$/, "")}`;
  }
}

/** Static analysis of a generated Expo project: imports, validation, dependency and graph extraction. */

export type ProjectFiles = Readonly<Record<string, string>>;

export type IssueKind = "missing-entry" | "no-default-export" | "unknown-package" | "missing-file" | "syntax-error";

export interface ProjectIssue {
  path: string;
  kind: IssueKind;
  message: string;
}

export type FileKind = "entry" | "screen" | "component" | "state" | "data" | "other";

const IMPORT_PATTERNS = [
  // Import/export clauses never contain quotes or semicolons, so bounding on them
  // stops a side-effect import from swallowing a later statement's `from`.
  /\bimport\s+(?:[^;'"]*?\s+from\s+)?['"]([^'"]+)['"]/g,
  /\bexport\s+[^;'"]*?\s+from\s+['"]([^'"]+)['"]/g,
  /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g,
];
const SAFE_PATH = /^(?!\/)(?!.*\.\.)[A-Za-z0-9_\-./]+\.(js|jsx|ts|tsx|json)$/;
const RESOLVE_SUFFIXES = ["", ".js", ".jsx", ".ts", ".tsx", ".json", "/index.js", "/index.jsx", "/index.ts", "/index.tsx"];

function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

export function extractImports(code: string): string[] {
  const clean = stripComments(code);
  const found: { index: number; spec: string }[] = [];
  for (const pattern of IMPORT_PATTERNS) {
    for (const m of clean.matchAll(pattern)) found.push({ index: m.index ?? 0, spec: m[1] });
  }
  const seen = new Set<string>();
  return found
    .sort((a, b) => a.index - b.index)
    .map((f) => f.spec)
    .filter((spec) => (seen.has(spec) ? false : (seen.add(spec), true)));
}

export function packageName(spec: string): string {
  const parts = spec.split("/");
  return spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

export function isSafePath(path: string): boolean {
  return SAFE_PATH.test(path);
}

function dirname(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i);
}

function normalize(path: string): string | null {
  const out: string[] = [];
  for (const part of path.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (out.length === 0) return null;
      out.pop();
    } else out.push(part);
  }
  return out.join("/");
}

export function resolveImport(fromPath: string, spec: string, files: ProjectFiles): string | null {
  const base = normalize(`${dirname(fromPath)}/${spec}`);
  if (base === null) return null;
  const hit = RESOLVE_SUFFIXES.map((s) => base + s).find((candidate) => candidate in files);
  return hit ?? null;
}

const isRelative = (spec: string) => spec.startsWith(".");

export function checkProject(files: ProjectFiles): ProjectIssue[] {
  const issues: ProjectIssue[] = [];
  const entry = files[ENTRY_FILE];
  if (entry === undefined) {
    issues.push({ path: ENTRY_FILE, kind: "missing-entry", message: `${ENTRY_FILE} is missing — Expo needs it as the entry point.` });
  } else if (!/export\s+default\b/.test(entry)) {
    issues.push({ path: ENTRY_FILE, kind: "no-default-export", message: `${ENTRY_FILE} must \`export default\` the root component.` });
  }

  for (const [path, code] of Object.entries(files)) {
    if (!/\.(js|jsx|ts|tsx)$/.test(path)) continue;
    // Acorn parses JS/JSX only; generated apps are JavaScript, TS files skip the syntax pass.
    const syntax = /\.(js|jsx)$/.test(path) ? syntaxError(code) : null;
    if (syntax) issues.push({ path, kind: "syntax-error", message: syntax });
    for (const spec of extractImports(code)) {
      if (isRelative(spec)) {
        if (!resolveImport(path, spec, files)) {
          issues.push({ path, kind: "missing-file", message: `Imports "${spec}" but that file does not exist.` });
        }
      } else if (!(packageName(spec) in ALLOWED_PACKAGES)) {
        issues.push({ path, kind: "unknown-package", message: `Package "${packageName(spec)}" is not available in this studio.` });
      }
    }
  }
  return issues;
}

/** Collects every third-party package used by the project. */
export function usedPackages(files: ProjectFiles): Set<string> {
  const used = new Set<string>();
  for (const code of Object.values(files)) {
    for (const spec of extractImports(code)) if (!isRelative(spec)) used.add(packageName(spec));
  }
  return used;
}

export function snackDependencies(files: ProjectFiles): Record<string, { version: string }> {
  const used = usedPackages(files);
  if ([...used].some((p) => p.startsWith("@react-navigation/"))) NAVIGATION_PEERS.forEach((p) => used.add(p));
  const deps: Record<string, { version: string }> = {};
  for (const name of [...used].sort()) {
    if (PRELOADED_PACKAGES.has(name) || !(name in ALLOWED_PACKAGES)) continue;
    deps[name] = { version: ALLOWED_PACKAGES[name] };
  }
  return deps;
}

export function classifyFile(path: string): FileKind {
  if (path === ENTRY_FILE) return "entry";
  if (/(^|\/)screens\//.test(path)) return "screen";
  if (/(^|\/)components\//.test(path)) return "component";
  if (/(^|\/)(context|store|state|hooks)\//.test(path)) return "state";
  if (/(^|\/)(data|services|api|utils|storage)\//.test(path)) return "data";
  return "other";
}

export interface ImportGraph {
  nodes: { id: string; kind: FileKind }[];
  edges: { from: string; to: string }[];
}

export function buildImportGraph(files: ProjectFiles): ImportGraph {
  const paths = Object.keys(files).sort();
  const edges: ImportGraph["edges"] = [];
  for (const path of paths) {
    for (const spec of extractImports(files[path])) {
      if (!isRelative(spec)) continue;
      const to = resolveImport(path, spec, files);
      if (to && to !== path) edges.push({ from: path, to });
    }
  }
  return { nodes: paths.map((id) => ({ id, kind: classifyFile(id) })), edges };
}
