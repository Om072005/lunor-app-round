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

  if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(text)) return new AiError("RATE_LIMIT");
  if (status === 401 || status === 403 || /API key not valid|PERMISSION_DENIED|API_KEY_INVALID/i.test(text)) {
    return new AiError("INVALID_KEY");
  }
  if (status === 404 || status === 503 || /not found|UNAVAILABLE|overloaded/i.test(text)) return new AiError("MODEL_UNAVAILABLE");
  if (status === 400) return new AiError("BAD_REQUEST", "The AI rejected the request. Try shortening your input.");
  return new AiError("UPSTREAM");
}

/** Errors worth retrying on the next model in the fallback chain. */
export function isFallbackWorthy(err: AiError): boolean {
  return err.code === "MODEL_UNAVAILABLE" || err.code === "RATE_LIMIT";
}

/** Converts a Zod schema to the JSON Schema subset Gemini's responseJsonSchema accepts. */
export function toGeminiSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { target: "draft-2020-12" }) as Record<string, unknown>;
  return sanitize(json) as Record<string, unknown>;
}

const DROPPED_KEYS = new Set(["$schema", "additionalProperties", "~standard"]);

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([k]) => !DROPPED_KEYS.has(k))
      .map(([k, v]) => [k, sanitize(v)]),
  );
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
