import { describe, expect, test } from "vitest";
import { clientIp, createRateLimiter } from "../api/rate-limit";
import { FilesSchema, ModifyRequest, UnderstandRequest } from "../api/requests";

describe("createRateLimiter", () => {
  test("allows up to the limit, then blocks until the window resets", () => {
    const limiter = createRateLimiter(2, 60_000);
    expect(limiter.check("ip", 0).allowed).toBe(true);
    expect(limiter.check("ip", 1).allowed).toBe(true);
    const blocked = limiter.check("ip", 30_000);
    expect(blocked).toEqual({ allowed: false, retryAfterSec: 30 });
    expect(limiter.check("ip", 60_000).allowed).toBe(true);
  });

  test("tracks keys independently", () => {
    const limiter = createRateLimiter(1, 1000);
    expect(limiter.check("a", 0).allowed).toBe(true);
    expect(limiter.check("b", 0).allowed).toBe(true);
    expect(limiter.check("a", 1).allowed).toBe(false);
  });

  test("evicts all keys when the map is full instead of growing unbounded", () => {
    const limiter = createRateLimiter(1, 1000, 2);
    limiter.check("a", 0);
    limiter.check("b", 0);
    limiter.check("c", 0);
    expect(limiter.check("a", 1).allowed).toBe(true);
  });
});

describe("clientIp", () => {
  test("uses the first x-forwarded-for hop, then x-real-ip, then a fallback", () => {
    expect(clientIp(new Request("http://x", { headers: { "x-forwarded-for": "1.1.1.1, 2.2.2.2" } }))).toBe("1.1.1.1");
    expect(clientIp(new Request("http://x", { headers: { "x-real-ip": "3.3.3.3" } }))).toBe("3.3.3.3");
    expect(clientIp(new Request("http://x"))).toBe("unknown");
  });
});

describe("request schemas", () => {
  test("idea must be descriptive but bounded", () => {
    expect(UnderstandRequest.safeParse({ idea: "todo" }).success).toBe(false);
    expect(UnderstandRequest.safeParse({ idea: "A habit tracker for college students" }).success).toBe(true);
    expect(UnderstandRequest.safeParse({ idea: "x".repeat(1001) }).success).toBe(false);
  });

  test("files reject path traversal and oversize projects", () => {
    expect(FilesSchema.safeParse({ "App.js": "x" }).success).toBe(true);
    expect(FilesSchema.safeParse({ "../secret.js": "x" }).success).toBe(false);
    const many = Object.fromEntries(Array.from({ length: 31 }, (_, i) => [`f${i}.js`, ""]));
    expect(FilesSchema.safeParse(many).success).toBe(false);
  });

  test("modify requires an instruction for change mode and issues for fix mode", () => {
    const brief = {
      name: "A", tagline: "t", problem: "p",
      personas: [{ name: "n", description: "d", needs: ["x"] }],
      features: [1, 2, 3].map((i) => ({ id: `f${i}`, name: "n", description: "d", priority: "must", userStory: "s" })),
      outOfScope: [], assumptions: [],
    };
    expect(ModifyRequest.safeParse({ brief, files: {}, mode: "change" }).success).toBe(false);
    expect(ModifyRequest.safeParse({ brief, files: {}, mode: "change", instruction: "make it blue" }).success).toBe(true);
    expect(ModifyRequest.safeParse({ brief, files: {}, mode: "fix", issues: [] }).success).toBe(false);
  });
});
