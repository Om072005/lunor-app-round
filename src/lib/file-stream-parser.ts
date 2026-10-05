/**
 * Code generation uses a plain-text block protocol instead of JSON:
 *
 *   <<<NOTES>>> ...markdown... <<<END NOTES>>>
 *   <<<FILE path/to/File.js>>> ...code... <<<END FILE>>>
 *
 * Source code inside JSON strings is where LLMs most often break escaping, and
 * a text protocol can be parsed incrementally so the UI shows files as they stream.
 */

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface ParsedFileStream {
  notes: string;
  files: GeneratedFile[];
  partial: GeneratedFile | null;
}

const NOTES_OPEN = "<<<NOTES>>>";
const NOTES_CLOSE = "<<<END NOTES>>>";
const FILE_OPEN = /<<<FILE\s+([^>\n]+?)\s*>>>/g;
const FILE_CLOSE = "<<<END FILE>>>";

export function parseFileStream(text: string): ParsedFileStream {
  return { notes: parseNotes(text), ...parseFiles(text) };
}

function parseNotes(text: string): string {
  const start = text.indexOf(NOTES_OPEN);
  if (start === -1) return "";
  const bodyStart = start + NOTES_OPEN.length;
  const end = text.indexOf(NOTES_CLOSE, bodyStart);
  const fileStart = text.indexOf("<<<FILE", bodyStart);
  const stop = end !== -1 ? end : fileStart !== -1 ? fileStart : text.length;
  return text.slice(bodyStart, stop).trim();
}

function parseFiles(text: string): Pick<ParsedFileStream, "files" | "partial"> {
  const byPath = new Map<string, string>();
  let partial: GeneratedFile | null = null;

  for (const match of text.matchAll(FILE_OPEN)) {
    const path = match[1].trim();
    const bodyStart = (match.index ?? 0) + match[0].length;
    const end = text.indexOf(FILE_CLOSE, bodyStart);
    if (end === -1) {
      partial = { path, content: stripFences(text.slice(bodyStart), false) };
      break;
    }
    byPath.set(path, stripFences(text.slice(bodyStart, end), true));
  }

  const files = [...byPath.entries()].map(([path, content]) => ({ path, content }));
  return { files, partial };
}

function stripFences(raw: string, complete: boolean): string {
  let body = raw.replace(/^\r?\n/, "");
  body = body.replace(/^```[\w-]*\r?\n/, "");
  if (complete) {
    body = body.replace(/\r?\n?```\s*$/, "\n");
    body = body.replace(/\s+$/, "") + "\n";
  }
  return body;
}
