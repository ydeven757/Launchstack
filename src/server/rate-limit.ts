import "server-only";

/**
 * In-memory token-bucket rate limiter. Adequate for single-instance MVP; swap
 * for Upstash/Redis when scaling horizontally (the API surface here stays the
 * same).
 *
 * Limits keyed by an arbitrary string — caller chooses what to key by
 * (typically IP + tenantId for public endpoints).
 */
type Bucket = { tokens: number; lastRefillMs: number };
const buckets = new Map<string, Bucket>();

export type RateLimitConfig = {
  /** Max tokens (= max requests in a burst). */
  capacity: number;
  /** Tokens refilled per second. */
  refillPerSec: number;
};

const DEFAULT: RateLimitConfig = { capacity: 10, refillPerSec: 0.2 }; // 10 burst, ~12/min sustained

export function rateLimit(key: string, cfg: Partial<RateLimitConfig> = {}): { ok: boolean; remaining: number; retryAfterSec: number } {
  const c = { ...DEFAULT, ...cfg };
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: c.capacity, lastRefillMs: now };

  // Refill
  const elapsedSec = (now - b.lastRefillMs) / 1000;
  b.tokens = Math.min(c.capacity, b.tokens + elapsedSec * c.refillPerSec);
  b.lastRefillMs = now;

  if (b.tokens >= 1) {
    b.tokens -= 1;
    buckets.set(key, b);
    return { ok: true, remaining: Math.floor(b.tokens), retryAfterSec: 0 };
  }

  buckets.set(key, b);
  const retryAfterSec = Math.ceil((1 - b.tokens) / c.refillPerSec);
  return { ok: false, remaining: 0, retryAfterSec };
}

// Periodic prune to stop the map growing forever
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const cutoff = Date.now() - 30 * 60 * 1000;
    for (const [k, b] of buckets) {
      if (b.lastRefillMs < cutoff) buckets.delete(k);
    }
  }, 5 * 60 * 1000).unref?.();
}
