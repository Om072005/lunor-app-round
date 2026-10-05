import "server-only";
import type { z } from "zod";
import { AiError, toAiError } from "../ai/errors";
import { resolveApiKey } from "../ai/gemini";
import { clientIp, createRateLimiter } from "./rate-limit";

/** Shared plumbing for every AI route: rate limit → validate body → resolve key → run → uniform errors. */

const limiter = createRateLimiter(Number(process.env.RATE_LIMIT_PER_MIN ?? 20), 60_000);

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
  options: { requiresKey?: boolean } = {},
): Promise<Response> {
  const { allowed, retryAfterSec } = limiter.check(clientIp(request));
  if (!allowed) return errorResponse("RATE_LIMIT", "Too many requests — slow down a little.", 429, retryAfterSec);

  let raw: unknown;
  try {
    raw = await request.json();
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
