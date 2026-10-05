import { describe, expect, test } from "vitest";
import { z } from "zod";
import { AiError, extractJson, isFallbackWorthy, toAiError, toGeminiSchema } from "../ai/errors";

describe("toAiError", () => {
  test.each([
    [{ status: 429, message: "x" }, "RATE_LIMIT"],
    [new Error("RESOURCE_EXHAUSTED: quota exceeded"), "RATE_LIMIT"],
    [{ status: 403 }, "INVALID_KEY"],
    [new Error("API key not valid. Please pass a valid API key."), "INVALID_KEY"],
    [{ status: 404 }, "MODEL_UNAVAILABLE"],
    [{ status: 503 }, "MODEL_UNAVAILABLE"],
    [{ status: 400 }, "BAD_REQUEST"],
    [new Error("socket hang up"), "UPSTREAM"],
    ["weird", "UPSTREAM"],
  ])("maps %o to %s", (input, code) => {
    expect(toAiError(input).code).toBe(code);
  });

  test("passes AiError through unchanged and sets HTTP status", () => {
    const err = new AiError("NO_KEY");
    expect(toAiError(err)).toBe(err);
    expect(err.status).toBe(503);
    expect(err.message).toMatch(/sample project/);
  });

  test("only quota and availability errors trigger model fallback", () => {
    expect(isFallbackWorthy(new AiError("RATE_LIMIT"))).toBe(true);
    expect(isFallbackWorthy(new AiError("MODEL_UNAVAILABLE"))).toBe(true);
    expect(isFallbackWorthy(new AiError("INVALID_KEY"))).toBe(false);
  });
});

describe("toGeminiSchema", () => {
  test("drops keys Gemini rejects, recursively", () => {
    const schema = z.object({ a: z.string(), nested: z.object({ b: z.array(z.object({ c: z.number() })) }) });
    const json = JSON.stringify(toGeminiSchema(schema));
    expect(json).not.toContain("$schema");
    expect(json).not.toContain("additionalProperties");
    expect(json).toContain('"required"');
  });
});

describe("extractJson", () => {
  test("parses plain, fenced and prose-wrapped JSON", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
    expect(extractJson('```json\n{"a":2}\n```')).toEqual({ a: 2 });
    expect(extractJson('Here it is: {"a":3} thanks')).toEqual({ a: 3 });
  });

  test("throws BAD_OUTPUT on garbage", () => {
    expect(() => extractJson("no json here")).toThrow(AiError);
    expect(() => extractJson("{ broken")).toThrow(AiError);
    expect(() => extractJson("{ still } broken }")).toThrow(AiError);
  });
});
