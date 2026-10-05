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

/** The server appends `<<<ERROR CODE>>>` as the very last thing in a stream when generation fails or stops early. */
const TRAILING_ERROR = /\n?<<<ERROR (\w+)>>>\s*$/;

export interface FinalizedStream {
  parsed: ParsedFileStream;
  /** Error code from the server, or null when the generation finished normally. */
  error: string | null;
}

/**
 * Interprets a finished stream. Without a server error, a last file missing only its
 * close marker is accepted (models often drop the final marker). With an error, the
 * unfinished file stays in `partial` and must not be applied.
 */
export function splitTrailingError(text: string): { body: string; error: string | null } {
  const marker = text.match(TRAILING_ERROR);
  return marker ? { body: text.slice(0, marker.index), error: marker[1] } : { body: text, error: null };
}

export function finalizeStream(text: string): FinalizedStream {
  const { body, error } = splitTrailingError(text);
  const parsed = parseFileStream(body);
  if (error) return { parsed, error };
  if (!parsed.partial) return { parsed, error: null };
  const files = [...parsed.files.filter((f) => f.path !== parsed.partial!.path), { ...parsed.partial, content: parsed.partial.content.replace(/\s*$/, "\n") }];
  return { parsed: { ...parsed, files, partial: null }, error: null };
}
