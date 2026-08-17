import { NextRequest, NextResponse } from "next/server";

// Gracefully no-ops when Upstash env vars are absent (local dev without Redis)
async function getRatelimiter(requests: number, windowSeconds: number) {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  const { Ratelimit } = await import("@upstash/ratelimit");
  const { Redis } = await import("@upstash/redis");
  return new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(requests, `${windowSeconds} s`),
    analytics: false,
  });
}

interface RateLimitOptions {
  /** requests allowed in the window */
  requests: number;
  /** window size in seconds */
  windowSeconds: number;
  /** key to rate-limit on — uid for authed routes, IP for pre-auth */
  key: string;
}

/**
 * Returns a 429 NextResponse if the limit is exceeded, null otherwise.
 * Call at the top of an API route handler before any business logic.
 */
export async function checkRateLimit(
  _req: NextRequest,
  { requests, windowSeconds, key }: RateLimitOptions
): Promise<NextResponse | null> {
  const limiter = await getRatelimiter(requests, windowSeconds);
  if (!limiter) return null; // dev mode — skip

  // Fail open: if Redis is unreachable (e.g. archived/paused Upstash DB), losing
  // rate limiting is better than 500ing every route that calls this.
  let success: boolean;
  try {
    ({ success } = await limiter.limit(key));
  } catch (err) {
    console.error(`Rate limit check failed for ${key}; allowing request`, err);
    return null;
  }
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  return null;
}

/** Convenience helpers for common rate limit policies */
export const rateLimits = {
  /** Pre-auth endpoints (invite redemption page load, etc.) — keyed by IP */
  preAuth: (req: NextRequest) =>
    checkRateLimit(req, {
      requests: 5,
      windowSeconds: 60,
      key: `ip:${req.headers.get("x-forwarded-for") ?? "unknown"}`,
    }),

  /** Mutating endpoints for authenticated users — keyed by uid */
  mutation: (req: NextRequest, uid: string) =>
    checkRateLimit(req, {
      requests: 20,
      windowSeconds: 3600,
      key: `uid:${uid}`,
    }),

  /** Invite creation — tighter limit to protect email sending costs */
  invite: (req: NextRequest, uid: string) =>
    checkRateLimit(req, {
      requests: 10,
      windowSeconds: 3600,
      key: `invite:${uid}`,
    }),

  /** Flight add — one AeroAPI call per request, protect costs */
  flightAdd: (req: NextRequest, uid: string) =>
    checkRateLimit(req, {
      requests: 30,
      windowSeconds: 3600,
      key: `flight:${uid}`,
    }),
};
