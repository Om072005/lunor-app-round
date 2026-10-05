import { describe, expect, test } from "vitest";
import { z } from "zod";
import { AiError, extractJson, isFallbackWorthy, repairTooBig, toAiError, toGeminiSchema } from "../ai/errors";

describe("toAiError", () => {
  test.each([
    [{ status: 429, message: "x" }, "RATE_LIMIT"],
    [new Error("RESOURCE_EXHAUSTED: quota exceeded"), "RATE_LIMIT"],
    [{ status: 403 }, "INVALID_KEY"],
    [new Error("API key not valid. Please pass a valid API key."), "INVALID_KEY"],
    [{ status: 404 }, "MODEL_UNAVAILABLE"],
    [{ status: 503 }, "MODEL_UNAVAILABLE"],
    [{ status: 400 }, "BAD_REQUEST"],
    [new Error("This model models/gemini-2.5-flash is no longer available to new users."), "MODEL_UNAVAILABLE"],
    [new DOMException("The operation timed out.", "TimeoutError"), "MODEL_UNAVAILABLE"],
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
    expect(isFallbackWorthy(new AiError("BAD_REQUEST"))).toBe(true);
    expect(isFallbackWorthy(new AiError("INVALID_KEY"))).toBe(false);
    expect(isFallbackWorthy(new AiError("NO_KEY"))).toBe(false);
  });
});

describe("toGeminiSchema", () => {
  test("drops keys Gemini rejects, recursively", () => {
    const schema = z.object({ a: z.string(), nested: z.object({ b: z.array(z.object({ c: z.number() })).min(1).max(3) }) });
    const json = JSON.stringify(toGeminiSchema(schema));
    expect(json).not.toContain("$schema");
    expect(json).not.toContain("additionalProperties");
    expect(json).not.toContain("minItems");
    expect(json).toContain('"required"');
  });
});

describe("repairTooBig", () => {
  const schema = z.object({ items: z.array(z.object({ tags: z.array(z.string()).max(2) })).max(2) });

  test("truncates arrays that exceed their max, including nested ones", () => {
    const data = { items: [{ tags: ["a", "b", "c"] }, { tags: [] }, { tags: [] }] };
    const first = schema.safeParse(data);
    expect(first.success).toBe(false);
    const repaired = repairTooBig(data, first.error!.issues);
    expect(schema.safeParse(repaired).success).toBe(true);
    expect(repaired).toEqual({ items: [{ tags: ["a", "b"] }, { tags: [] }] });
    expect(data.items).toHaveLength(3);
  });

  test("returns null when issues are not repairable", () => {
    const res = z.object({ a: z.string() }).safeParse({ a: 1 });
    expect(repairTooBig({ a: 1 }, res.error!.issues)).toBeNull();
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
