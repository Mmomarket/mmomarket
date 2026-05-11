/**
 * Simple in-memory rate limiter.
 *
 * NOTE: This works for single-instance deployments (dev, single Vercel function).
 * For multi-instance production deployments use @upstash/ratelimit with Redis:
 *   https://github.com/upstash/ratelimit
 *
 * Usage:
 *   const result = rateLimit("register", ip, { limit: 5, windowMs: 60_000 });
 *   if (!result.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Store: key → { count, resetAt }
const store = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes to prevent unbounded memory growth
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, entry] of store.entries()) {
        if (entry.resetAt < now) store.delete(key);
      }
    },
    5 * 60 * 1000,
  );
}

export interface RateLimitOptions {
  /** Max requests allowed in the window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  namespace: string,
  identifier: string,
  options: RateLimitOptions,
): RateLimitResult {
  const key = `${namespace}:${identifier}`;
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // First request in window
    store.set(key, { count: 1, resetAt: now + options.windowMs });
    return {
      ok: true,
      remaining: options.limit - 1,
      resetAt: now + options.windowMs,
    };
  }

  if (entry.count >= options.limit) {
    return { ok: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return {
    ok: true,
    remaining: options.limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/** Extract best-effort client IP from a Next.js Request */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
