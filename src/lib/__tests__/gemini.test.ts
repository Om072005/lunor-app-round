import { beforeEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));

const generateContent = vi.fn();
const generateContentStream = vi.fn();
vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(function () {
    return { models: { generateContent, generateContentStream } };
  }),
}));

const { generateJson, hasServerKey, resolveApiKey, streamText } = await import("../ai/gemini");

const schema = z.object({ items: z.array(z.string()).max(2) });
const base = { apiKey: "k", system: "s", prompt: "p" };

async function* chunks(texts: string[], failAfter?: Error) {
  for (const text of texts) yield { text };
  if (failAfter) throw failAfter;
}

async function readAll(stream: ReadableStream<Uint8Array>): Promise<string> {
  return new Response(stream).text();
}

beforeEach(() => {
  generateContent.mockReset();
  generateContentStream.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  delete process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_MODELS_FAST;
});

describe("resolveApiKey", () => {
  test("prefers a well-formed user key from the header", () => {
    process.env.GEMINI_API_KEY = "server-key-0123456789abcdef";
    const req = new Request("http://x", { headers: { "x-gemini-key": "AQ.user_key-0123456789abcdef" } });
    expect(resolveApiKey(req)).toBe("AQ.user_key-0123456789abcdef");
  });

  test("rejects malformed user keys", () => {
    const req = new Request("http://x", { headers: { "x-gemini-key": "bad key with spaces" } });
    expect(() => resolveApiKey(req)).toThrow(/rejected/);
  });

  test("falls back to the server key, and errors with NO_KEY when there is none", () => {
    expect(hasServerKey()).toBe(false);
    expect(() => resolveApiKey(new Request("http://x"))).toThrow(/not configured/);
    process.env.GEMINI_API_KEY = "server-key-0123456789abcdef";
    expect(hasServerKey()).toBe(true);
    expect(resolveApiKey(new Request("http://x"))).toBe("server-key-0123456789abcdef");
  });
});

describe("generateJson", () => {
  test("returns schema-valid output and sends a sanitized JSON schema", async () => {
    generateContent.mockResolvedValue({ text: '{"items":["a"]}' });
    await expect(generateJson({ ...base, schema })).resolves.toEqual({ items: ["a"] });
    const config = generateContent.mock.calls[0][0].config;
    expect(config.responseMimeType).toBe("application/json");
    expect(JSON.stringify(config.responseJsonSchema)).not.toContain("maxItems");
  });

  test("trims over-long arrays instead of failing", async () => {
    generateContent.mockResolvedValue({ text: '{"items":["a","b","c"]}' });
    await expect(generateJson({ ...base, schema })).resolves.toEqual({ items: ["a", "b"] });
  });

  test("falls back to the next model when the first is overloaded", async () => {
    generateContent.mockRejectedValueOnce(Object.assign(new Error("high demand"), { status: 503 })).mockResolvedValue({ text: '{"items":[]}' });
    await expect(generateJson({ ...base, schema, tier: "quality" })).resolves.toEqual({ items: [] });
    const models = generateContent.mock.calls.map((c) => c[0].model);
    expect(models[0]).not.toBe(models[1]);
  });

  test("does not fall back on an invalid key", async () => {
    generateContent.mockRejectedValue(Object.assign(new Error("API key not valid"), { status: 400 }));
    await expect(generateJson({ ...base, schema })).rejects.toMatchObject({ code: "INVALID_KEY" });
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  test("retries malformed output, then reports BAD_OUTPUT after every model fails", async () => {
    process.env.GEMINI_MODELS_FAST = "only-model";
    generateContent.mockResolvedValue({ text: "not json" });
    await expect(generateJson({ ...base, schema })).rejects.toMatchObject({ code: "BAD_OUTPUT" });
    expect(generateContent).toHaveBeenCalledTimes(2);
  });
});

describe("streamText", () => {
  test("streams every chunk", async () => {
    generateContentStream.mockResolvedValue(chunks(["Hello ", "", "world"]));
    expect(await readAll(await streamText(base))).toBe("Hello world");
  });

  test("appends an error marker when the stream breaks midway", async () => {
    generateContentStream.mockResolvedValue(chunks(["partial"], Object.assign(new Error("quota"), { status: 429 })));
    expect(await readAll(await streamText(base))).toBe("partial\n<<<ERROR RATE_LIMIT>>>");
  });

  test("flags a stream that ends for any reason other than STOP", async () => {
    async function* early() {
      yield { text: "<<<FILE a.js>>>\nconst", candidates: [{ finishReason: "RECITATION" }] };
    }
    generateContentStream.mockResolvedValue(early());
    expect(await readAll(await streamText(base))).toBe("<<<FILE a.js>>>\nconst\n<<<ERROR INCOMPLETE>>>");

    async function* clean() {
      yield { text: "done", candidates: [{ finishReason: "STOP" }] };
    }
    generateContentStream.mockResolvedValue(clean());
    expect(await readAll(await streamText(base))).toBe("done");
  });

  test("falls back before the first token and surfaces errors to the route", async () => {
    generateContentStream
      .mockRejectedValueOnce(Object.assign(new Error("unavailable"), { status: 503 }))
      .mockResolvedValue(chunks(["ok"]));
    expect(await readAll(await streamText(base))).toBe("ok");

    generateContentStream.mockReset().mockRejectedValue(Object.assign(new Error("denied"), { status: 403 }));
    await expect(streamText(base)).rejects.toMatchObject({ code: "INVALID_KEY" });
  });
});
