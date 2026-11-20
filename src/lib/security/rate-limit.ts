interface Bucket {
  tokens: number;
  lastRefillMs: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAfterMs: number;
}

/**
 * In-memory token bucket rate limiter suitable for Next.js Route Handlers.
 * Can be swapped cleanly for Redis / Upstash in distributed deployments.
 */
export function checkRateLimit(
  key: string,
  capacity = 60,
  refillPerMinute = 60
): RateLimitResult {
  const now = Date.now();
  const refillRatePerMs = refillPerMinute / 60_000;
  const current = buckets.get(key) ?? { tokens: capacity, lastRefillMs: now };

  const elapsed = Math.max(0, now - current.lastRefillMs);
  const replenished = Math.min(capacity, current.tokens + elapsed * refillRatePerMs);

  if (replenished < 1) {
    const resetAfterMs = Math.ceil((1 - replenished) / refillRatePerMs);
    buckets.set(key, { tokens: replenished, lastRefillMs: now });
    return { allowed: false, remaining: 0, resetAfterMs };
  }

  const remaining = replenished - 1;
  buckets.set(key, { tokens: remaining, lastRefillMs: now });
  return {
    allowed: true,
    remaining: Math.floor(remaining),
    resetAfterMs: 0,
  };
}

export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "local-client";
}
