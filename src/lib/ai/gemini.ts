import "server-only";
import { GoogleGenAI } from "@google/genai";
import type { z } from "zod";
import { AiError, extractJson, isFallbackWorthy, toAiError, toGeminiSchema } from "./errors";

/**
 * Thin Gemini wrapper. Two call shapes cover every stage:
 *  - generateJson: structured output validated against a Zod schema (Understand, Plan, Explain, Learn)
 *  - streamText:   raw token stream (Build/Modify use the file block protocol; Ask streams markdown)
 * Requests walk a model fallback chain so a free-tier quota or outage on one model degrades gracefully.
 */

const DEFAULT_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];

function modelChain(): string[] {
  const configured = process.env.GEMINI_MODELS?.split(",").map((m) => m.trim()).filter(Boolean);
  return configured && configured.length > 0 ? configured : DEFAULT_MODELS;
}

const KEY_FORMAT = /^[A-Za-z0-9_-]{20,200}$/;

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
}

async function withFallback<T>(run: (model: string) => Promise<T>): Promise<T> {
  let lastError: AiError = new AiError("UPSTREAM");
  for (const model of modelChain()) {
    try {
      return await run(model);
    } catch (err) {
      lastError = toAiError(err);
      console.error(`[gemini] ${model} failed: ${lastError.code}`, err instanceof Error ? err.message : err);
      if (!isFallbackWorthy(lastError)) throw lastError;
    }
  }
  throw lastError;
}

export async function generateJson<S extends z.ZodType>(opts: BaseOptions & { schema: S }): Promise<z.infer<S>> {
  const ai = new GoogleGenAI({ apiKey: opts.apiKey });
  const responseJsonSchema = toGeminiSchema(opts.schema);

  return withFallback(async (model) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await ai.models.generateContent({
        model,
        contents: opts.prompt,
        config: {
          systemInstruction: opts.system,
          temperature: attempt === 0 ? (opts.temperature ?? 0.7) : 0.3,
          responseMimeType: "application/json",
          responseJsonSchema,
        },
      });
      const parsed = opts.schema.safeParse(safeExtract(res.text ?? ""));
      if (parsed.success) return parsed.data;
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

export async function streamText(opts: BaseOptions): Promise<ReadableStream<Uint8Array>> {
  const ai = new GoogleGenAI({ apiKey: opts.apiKey });
  // Open the stream (and surface auth/quota errors) before returning, so the route can still send a JSON error.
  const iterator = await withFallback(async (model) => {
    const stream = await ai.models.generateContentStream({
      model,
      contents: opts.prompt,
      config: { systemInstruction: opts.system, temperature: opts.temperature ?? 0.6 },
    });
    const it = stream[Symbol.asyncIterator]();
    const first = await it.next();
    return { it, first };
  });

  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        let step = iterator.first;
        while (!step.done) {
          const text = step.value.text;
          if (text) controller.enqueue(encoder.encode(text));
          step = await iterator.it.next();
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
