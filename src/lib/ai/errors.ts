import { z } from "zod";

export type AiErrorCode = "NO_KEY" | "INVALID_KEY" | "RATE_LIMIT" | "BAD_OUTPUT" | "MODEL_UNAVAILABLE" | "UPSTREAM" | "BAD_REQUEST";

const HTTP_STATUS: Record<AiErrorCode, number> = {
  NO_KEY: 503,
  INVALID_KEY: 401,
  RATE_LIMIT: 429,
  BAD_OUTPUT: 502,
  MODEL_UNAVAILABLE: 503,
  UPSTREAM: 502,
  BAD_REQUEST: 400,
};

const USER_MESSAGES: Record<AiErrorCode, string> = {
  NO_KEY: "AI is not configured on this deployment. Add your own free Gemini key in Settings, or explore a sample project.",
  INVALID_KEY: "The Gemini API key was rejected. Check the key in Settings.",
  RATE_LIMIT: "Gemini free-tier rate limit reached. Wait about a minute and try again.",
  BAD_OUTPUT: "The AI returned an incomplete answer. Please try again.",
  MODEL_UNAVAILABLE: "The Gemini model is temporarily unavailable. Please try again shortly.",
  UPSTREAM: "The AI service had a problem. Please try again.",
  BAD_REQUEST: "The request was invalid.",
};

export class AiError extends Error {
  readonly code: AiErrorCode;
  readonly status: number;

  constructor(code: AiErrorCode, message?: string) {
    super(message ?? USER_MESSAGES[code]);
    this.code = code;
    this.status = HTTP_STATUS[code];
  }
}

/** Maps any thrown value from the Gemini SDK into a typed, user-safe AiError. */
export function toAiError(err: unknown): AiError {
  if (err instanceof AiError) return err;
  const status = typeof err === "object" && err !== null && "status" in err ? Number((err as { status: unknown }).status) : NaN;
  const text = err instanceof Error ? err.message : String(err);
  const name = err instanceof Error || err instanceof DOMException ? err.name : "";

  // Our per-model timeout fired — treat like an overloaded model so the next one is tried.
  if (name === "TimeoutError" || name === "AbortError") return new AiError("MODEL_UNAVAILABLE");
  if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(text)) return new AiError("RATE_LIMIT");
  if (status === 401 || status === 403 || /API key not valid|PERMISSION_DENIED|API_KEY_INVALID/i.test(text)) {
    return new AiError("INVALID_KEY");
  }
  if (status === 404 || status === 503 || /not found|UNAVAILABLE|overloaded|high demand|no longer available/i.test(text)) {
    return new AiError("MODEL_UNAVAILABLE");
  }
  if (status === 400) return new AiError("BAD_REQUEST", "The AI rejected the request. Try shortening your input.");
  return new AiError("UPSTREAM");
}

/**
 * Errors worth retrying on the next model in the fallback chain. BAD_REQUEST is included because
 * models differ in which structured-output schema features they accept.
 */
export function isFallbackWorthy(err: AiError): boolean {
  return err.code === "MODEL_UNAVAILABLE" || err.code === "RATE_LIMIT" || err.code === "BAD_REQUEST" || err.code === "BAD_OUTPUT";
}

/** Converts a Zod schema to the JSON Schema subset Gemini's responseJsonSchema accepts. */
export function toGeminiSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { target: "draft-2020-12" }) as Record<string, unknown>;
  return sanitize(json) as Record<string, unknown>;
}

// Array bounds are dropped because flash-lite models reject a schema whose combined constraints are
// too complex (400 INVALID_ARGUMENT on the Plan schema). Counts are stated in the prompts and still
// enforced by Zod when the response is validated.
const DROPPED_KEYS = new Set(["$schema", "additionalProperties", "~standard", "minItems", "maxItems"]);

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([k]) => !DROPPED_KEYS.has(k))
      .map(([k, v]) => [k, sanitize(v)]),
  );
}

/**
 * Since array bounds are not sent to Gemini, a reply can contain one item too many.
 * Truncating is safer and cheaper than another (quota-limited) model call.
 * Returns a repaired deep copy, or null if any issue is something other than an over-long array.
 */
export function repairTooBig(data: unknown, issues: readonly z.core.$ZodIssue[]): unknown | null {
  if (issues.length === 0 || !issues.every((i) => i.code === "too_big" && i.origin === "array")) return null;
  const copy = structuredClone(data);
  // Deepest paths first so truncating a parent never invalidates a child path.
  for (const issue of [...issues].sort((a, b) => b.path.length - a.path.length)) {
    const target = issue.path.reduce<unknown>((node, key) => (node as Record<PropertyKey, unknown>)?.[key as PropertyKey], copy);
    if (!Array.isArray(target) || issue.code !== "too_big") return null;
    target.length = Number(issue.maximum);
  }
  return copy;
}

/** Parses model JSON, tolerating markdown fences or leading prose. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : text).trim();
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start === -1 || end <= start) throw new AiError("BAD_OUTPUT");
    try {
      return JSON.parse(candidate.slice(start, end + 1));
    } catch {
      throw new AiError("BAD_OUTPUT");
    }
  }
}
