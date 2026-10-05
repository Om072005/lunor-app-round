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
const FILE_OPEN = /<<<FILE\s+([^>\n]+?)\s*>>>/g;
// Models sometimes emit "<<<END FILE>" or "<<< END FILE >>"; accept any close-ish marker.
const FILE_CLOSE = /<<<\s*END\s*FILE\s*>*/;

export function parseFileStream(text: string): ParsedFileStream {
  return { notes: parseNotes(text), ...parseFiles(text) };
}

function parseNotes(text: string): string {
  const start = text.indexOf(NOTES_OPEN);
  if (start === -1) return "";
  const bodyStart = start + NOTES_OPEN.length;
  // Notes never contain "<<<", so the first marker of any kind ends them — robust to a wrong close marker.
  const marker = text.indexOf("<<<", bodyStart);
  const stop = marker !== -1 ? marker : text.length;
  // Models sometimes echo the format hint ("markdown:") as the first word.
  return text.slice(bodyStart, stop).trim().replace(/^markdown:\s*/i, "");
}

function parseFiles(text: string): Pick<ParsedFileStream, "files" | "partial"> {
  const byPath = new Map<string, string>();
  let partial: GeneratedFile | null = null;

  const openers = [...text.matchAll(FILE_OPEN)];
  openers.forEach((match, i) => {
    const path = match[1].trim();
    const bodyStart = (match.index ?? 0) + match[0].length;
    // A block never extends past the next FILE opener, even if its close marker is missing or malformed.
    const next = openers[i + 1];
    const region = text.slice(bodyStart, next ? next.index : text.length);
    const close = region.match(FILE_CLOSE);
    if (close) {
      byPath.set(path, stripFences(region.slice(0, close.index), true));
    } else if (next) {
      byPath.set(path, stripFences(region, true));
    } else {
      partial = { path, content: stripFences(region, false) };
    }
  });

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
