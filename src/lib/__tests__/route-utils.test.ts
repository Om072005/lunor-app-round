import { beforeEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));
vi.stubEnv("RATE_LIMIT_PER_MIN", "3");

const resolveApiKey = vi.fn();
vi.mock("../ai/gemini", () => ({ resolveApiKey: (r: Request) => resolveApiKey(r) }));

const { AiError } = await import("../ai/errors");
const { errorResponse, handleAiRoute, textStreamResponse } = await import("../api/route-utils");

const Body = z.object({ name: z.string().min(2, "Name too short") });
let ip = 0;
const post = (body: string) =>
  new Request("http://x/api", { method: "POST", body, headers: { "x-forwarded-for": `10.0.0.${++ip}` } });

beforeEach(() => {
  resolveApiKey.mockReset().mockReturnValue("key");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("handleAiRoute", () => {
  test("validates the body and passes the parsed data and key to the handler", async () => {
    const res = await handleAiRoute(post('{"name":"Ada"}'), Body, async ({ body, apiKey }) => Response.json({ body, apiKey }));
    expect(await res.json()).toEqual({ body: { name: "Ada" }, apiKey: "key" });
  });

  test("rejects non-JSON and schema-invalid bodies with 400 and a readable message", async () => {
    const notJson = await handleAiRoute(post("{oops"), Body, async () => new Response());
    expect(notJson.status).toBe(400);
    const invalid = await handleAiRoute(post('{"name":"A"}'), Body, async () => new Response());
    expect(await invalid.json()).toEqual({ error: { code: "BAD_REQUEST", message: "Name too short" } });
  });

  test("maps AiError and unexpected errors to safe responses", async () => {
    const known = await handleAiRoute(post('{"name":"Ada"}'), Body, async () => {
      throw new AiError("RATE_LIMIT");
    });
    expect(known.status).toBe(429);
    const unknown = await handleAiRoute(post('{"name":"Ada"}'), Body, async () => {
      throw new Error("db password is hunter2");
    });
    expect(unknown.status).toBe(502);
    expect(JSON.stringify(await unknown.json())).not.toContain("hunter2");
  });

  test("skips key resolution for routes that do not need AI", async () => {
    resolveApiKey.mockImplementation(() => {
      throw new AiError("NO_KEY");
    });
    const res = await handleAiRoute(post('{"name":"Ada"}'), Body, async () => Response.json({ ok: true }), { requiresKey: false });
    expect(res.status).toBe(200);
  });

  test("rate limits a single client", async () => {
    const same = () => new Request("http://x/api", { method: "POST", body: '{"name":"Ada"}', headers: { "x-forwarded-for": "9.9.9.9" } });
    const statuses = [];
    for (let i = 0; i < 4; i++) statuses.push((await handleAiRoute(same(), Body, async () => new Response("ok"))).status);
    expect(statuses).toEqual([200, 200, 200, 429]);
  });
});

describe("responses", () => {
  test("errorResponse sets Retry-After when given", () => {
    expect(errorResponse("RATE_LIMIT", "slow", 429, 30).headers.get("Retry-After")).toBe("30");
  });

  test("textStreamResponse is uncached plain text", () => {
    const res = textStreamResponse(new ReadableStream());
    expect(res.headers.get("Content-Type")).toContain("text/plain");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});
