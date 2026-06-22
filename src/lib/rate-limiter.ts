/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Note: This is per-process. For multi-instance deployments, replace with
 * a shared store (e.g. SQLite/Redis). For a single-user local-first app,
 * an in-memory limiter is sufficient to prevent trivial brute-force attacks.
 */

interface WindowEntry {
  timestamps: number[];
}

const stores = new Map<string, WindowEntry>();

/** Default: 10 requests per 60-second window per key. */
const DEFAULT_MAX_REQUESTS = 10;
const DEFAULT_WINDOW_MS = 60_000;

/**
 * Check whether a request identified by `key` is within the rate limit.
 *
 * Returns `true` if the request is allowed, `false` if rate-limited.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = DEFAULT_MAX_REQUESTS,
  windowMs: number = DEFAULT_WINDOW_MS,
): boolean {
  const now = Date.now();
  let entry = stores.get(key);

  if (!entry) {
    entry = { timestamps: [] };
    stores.set(key, entry);
  }

  // Track how many timestamps existed before filtering so we can detect
  // when all prior timestamps have expired (used for pruning below).
  const beforeCount = entry.timestamps.length;

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < windowMs);

  if (entry.timestamps.length >= maxRequests) {
    return false; // rate limited
  }

  entry.timestamps.push(now);

  // WHY: Prune entries where all previous timestamps expired (beforeCount > 0)
  // and only the just-pushed timestamp remains. Without pruning, stale entries
  // with empty timestamp arrays accumulate in the Map forever. For a local-first
  // app this is mostly precautionary — ~5-10 unique IPs — but it keeps the
  // implementation clean and avoids a memory leak if ever deployed publicly.
  if (beforeCount > 0 && entry.timestamps.length === 1) {
    stores.delete(key);
  }

  return true;
}

/** Reset the rate limiter (useful in tests). */
export function resetRateLimiter(): void {
  stores.clear();
}
