/**
 * Fixed-window, in-memory rate limiter keyed by client IP. On serverless this is
 * per-instance and best-effort — enough to stop one visitor from draining the
 * shared free-tier Gemini quota of a public demo.
 */
export interface RateLimiter {
  check(key: string, now?: number): { allowed: boolean; retryAfterSec: number };
}

export function createRateLimiter(limit: number, windowMs: number, maxKeys = 5000): RateLimiter {
  const hits = new Map<string, { count: number; windowStart: number }>();

  return {
    check(key, now = Date.now()) {
      const entry = hits.get(key);
      if (!entry || now - entry.windowStart >= windowMs) {
        if (hits.size >= maxKeys) hits.clear();
        hits.set(key, { count: 1, windowStart: now });
        return { allowed: true, retryAfterSec: 0 };
      }
      if (entry.count >= limit) {
        return { allowed: false, retryAfterSec: Math.ceil((entry.windowStart + windowMs - now) / 1000) };
      }
      hits.set(key, { count: entry.count + 1, windowStart: entry.windowStart });
      return { allowed: true, retryAfterSec: 0 };
    },
  };
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}
