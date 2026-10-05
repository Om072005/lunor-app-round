import "server-only";
import { GoogleGenAI } from "@google/genai";
import type { z } from "zod";
import { AiError, extractJson, isFallbackWorthy, repairTooBig, toAiError, toGeminiSchema } from "./errors";

/**
 * Thin Gemini wrapper. Two call shapes cover every stage:
 *  - generateJson: structured output validated against a Zod schema (Understand, Plan, Explain, Learn)
 *  - streamText:   raw token stream (Build/Modify use the file block protocol; Ask streams markdown)
 * Requests walk a model fallback chain so a free-tier quota or outage on one model degrades gracefully.
 */

/**
 * "quality" for reasoning-heavy stages (plan, code, curriculum); "fast" for short
 * interactive ones. Both fall back across models — the free tier sees frequent
 * 503 "high demand" spikes, and gemini-2.5-* is closed to new keys.
 */
export type ModelTier = "quality" | "fast";

const DEFAULT_MODELS: Record<ModelTier, string[]> = {
  quality: ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-flash-latest"],
  fast: ["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-flash-lite-latest"],
};

const ENV_KEYS: Record<ModelTier, string> = { quality: "GEMINI_MODELS_QUALITY", fast: "GEMINI_MODELS_FAST" };

/** Per-attempt timeout before falling back to the next model (a hung model must not eat the whole request). */
const ATTEMPT_TIMEOUT_MS: Record<ModelTier, number> = { quality: 120_000, fast: 45_000 };

function modelChain(tier: ModelTier): string[] {
  const configured = process.env[ENV_KEYS[tier]]?.split(",").map((m) => m.trim()).filter(Boolean);
  return configured && configured.length > 0 ? configured : DEFAULT_MODELS[tier];
}

// Covers classic "AIza…" keys and newer dotted "AQ.…" keys from Google AI Studio.
const KEY_FORMAT = /^[A-Za-z0-9._-]{20,300}$/;

/** A user-supplied key (header) wins over the server key, so graders can bring their own quota. */
export function resolveApiKey(request: Request): string {
  const userKey = request.headers.get("x-gemini-key")?.trim();
  if (userKey) {
    if (!KEY_FORMAT.test(userKey)) throw new AiError("INVALID_KEY");
    return userKey;
  }
  const serverKey = process.env.GEMINI_API_KEY?.trim();
  if (!serverKey) throw new AiError("NO_KEY");
  return serverKey;
}

export function hasServerKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

interface BaseOptions {
  apiKey: string;
  system: string;
  prompt: string;
  temperature?: number;
  tier?: ModelTier;
}

async function withFallback<T>(tier: ModelTier, run: (model: string, signal: AbortSignal) => Promise<T>): Promise<T> {
  let lastError: AiError = new AiError("UPSTREAM");
  for (const model of modelChain(tier)) {
    const started = Date.now();
    try {
      const result = await run(model, AbortSignal.timeout(ATTEMPT_TIMEOUT_MS[tier]));
      console.info(`[gemini] ${model} ok in ${Date.now() - started}ms`);
      return result;
    } catch (err) {
      lastError = toAiError(err);
      const detail = err instanceof Error ? err.message.slice(0, 160) : String(err);
      console.error(`[gemini] ${model} failed after ${Date.now() - started}ms: ${lastError.code} — ${detail}`);
      if (!isFallbackWorthy(lastError)) throw lastError;
    }
  }
  throw lastError;
}

export async function generateJson<S extends z.ZodType>(opts: BaseOptions & { schema: S }): Promise<z.infer<S>> {
  const ai = new GoogleGenAI({ apiKey: opts.apiKey });
  const responseJsonSchema = toGeminiSchema(opts.schema);

  return withFallback(opts.tier ?? "fast", async (model, abortSignal) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await ai.models.generateContent({
        model,
        contents: opts.prompt,
        config: {
          abortSignal,
          systemInstruction: opts.system,
          temperature: attempt === 0 ? (opts.temperature ?? 0.7) : 0.3,
          responseMimeType: "application/json",
          responseJsonSchema,
        },
      });
      const raw = safeExtract(res.text ?? "");
      const parsed = opts.schema.safeParse(raw);
      if (parsed.success) return parsed.data;
      const repaired = repairTooBig(raw, parsed.error.issues);
      const reparsed = repaired === null ? null : opts.schema.safeParse(repaired);
      if (reparsed?.success) return reparsed.data;
      console.error(`[gemini] ${model} schema mismatch (attempt ${attempt + 1})`, parsed.error.issues.slice(0, 3));
    }
    throw new AiError("BAD_OUTPUT");
  });
}

function safeExtract(text: string): unknown {
  try {
    return extractJson(text);
  } catch {
    return null;
  }
}

/** Rejects with a TimeoutError when the signal fires first. */
function raceSignal<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (v) => {
        signal.removeEventListener("abort", onAbort);
        resolve(v);
      },
      (e) => {
        signal.removeEventListener("abort", onAbort);
        reject(e);
      },
    );
  });
}

export async function streamText(opts: BaseOptions): Promise<ReadableStream<Uint8Array>> {
  const ai = new GoogleGenAI({ apiKey: opts.apiKey });
  // Open the stream (and surface auth/quota errors) before returning, so the route can still send a JSON error.
  // The timeout only guards time-to-first-token; once streaming, long generations must not be cut off.
  const iterator = await withFallback(opts.tier ?? "fast", async (model, firstTokenSignal) => {
    const stream = await raceSignal(
      ai.models.generateContentStream({
        model,
        contents: opts.prompt,
        config: { systemInstruction: opts.system, temperature: opts.temperature ?? 0.6 },
      }),
      firstTokenSignal,
    );
    const it = stream[Symbol.asyncIterator]();
    const first = await raceSignal(it.next(), firstTokenSignal);
    return { it, first };
  });

  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        let step = iterator.first;
        let finishReason: string | undefined;
        while (!step.done) {
          const text = step.value.text;
          if (text) controller.enqueue(encoder.encode(text));
          finishReason = step.value.candidates?.[0]?.finishReason ?? finishReason;
          step = await iterator.it.next();
        }
        // A clean end of stream is not success: MAX_TOKENS / RECITATION / SAFETY cut code off mid-project.
        if (finishReason && finishReason !== "STOP") {
          console.error(`[gemini] stream ended early: ${finishReason}`);
          controller.enqueue(encoder.encode(`\n<<<ERROR INCOMPLETE>>>`));
        }
      } catch (err) {
        const aiErr = toAiError(err);
        console.error("[gemini] stream interrupted", aiErr.code);
        controller.enqueue(encoder.encode(`\n<<<ERROR ${aiErr.code}>>>`));
      } finally {
        controller.close();
      }
    },
  });
}
