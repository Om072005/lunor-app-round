import "server-only";
import type { z } from "zod";
import { AiError, toAiError } from "../ai/errors";
import { resolveApiKey } from "../ai/gemini";
import { clientIp, createRateLimiter, type RateLimiter } from "./rate-limit";

/** Shared plumbing for every AI route: rate limit → size check → validate body → resolve key → run → uniform errors. */

const DEFAULT_PER_MINUTE = Number(process.env.RATE_LIMIT_PER_MIN ?? 20);
/** Largest legitimate body is a full project (~200k chars of code) plus brief and plan. */
const MAX_BODY_CHARS = 400_000;

// One limiter per bucket so cheap calls (understand, explain) don't share a budget with expensive code generation.
const limiters = new Map<string, RateLimiter>();
function limiterFor(bucket: string, perMinute: number): RateLimiter {
  const key = `${bucket}:${perMinute}`;
  if (!limiters.has(key)) limiters.set(key, createRateLimiter(perMinute, 60_000));
  return limiters.get(key)!;
}

export function errorResponse(code: string, message: string, status: number, retryAfterSec?: number): Response {
  const headers: HeadersInit = retryAfterSec ? { "Retry-After": String(retryAfterSec) } : {};
  return Response.json({ error: { code, message } }, { status, headers });
}

interface Context<T> {
  body: T;
  apiKey: string;
}

export async function handleAiRoute<S extends z.ZodType>(
  request: Request,
  schema: S,
  run: (ctx: Context<z.infer<S>>) => Promise<Response>,
  options: { requiresKey?: boolean; bucket?: string; perMinute?: number } = {},
): Promise<Response> {
  const limiter = limiterFor(options.bucket ?? "default", options.perMinute ?? DEFAULT_PER_MINUTE);
  const { allowed, retryAfterSec } = limiter.check(clientIp(request));
  if (!allowed) return errorResponse("RATE_LIMIT", "Too many requests — slow down a little.", 429, retryAfterSec);

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_CHARS * 4) return errorResponse("BAD_REQUEST", "Request is too large.", 413);

  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_CHARS) return errorResponse("BAD_REQUEST", "Request is too large.", 413);
    raw = JSON.parse(text);
  } catch {
    return errorResponse("BAD_REQUEST", "Request body must be JSON.", 400);
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return errorResponse("BAD_REQUEST", parsed.error.issues[0]?.message ?? "Invalid request.", 400);
  }

  try {
    const apiKey = options.requiresKey === false ? "" : resolveApiKey(request);
    return await run({ body: parsed.data, apiKey });
  } catch (err) {
    const aiErr = err instanceof AiError ? err : toAiError(err);
    if (!(err instanceof AiError)) console.error("[api] unexpected error", err);
    return errorResponse(aiErr.code, aiErr.message, aiErr.status);
  }
}

export function textStreamResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}
