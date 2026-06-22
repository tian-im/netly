import { createHash } from 'crypto';
import { MIN_BOOTSTRAP_TOKEN_LENGTH } from '@/lib/constants';

/**
 * In-memory cache for the MCP bootstrap token hash.
 *
 * WHY: The bootstrap token (MCP_INITIAL_TOKEN env var) lets AI agents
 * self-bootstrap MCP access at install time without a manual UI visit.
 * We cache the SHA-256 hash to avoid recomputing it on every request.
 *
 * This module is separated from route.ts because Next.js App Router
 * route files (app/api/**\/*\/route.ts) may only export HTTP method
 * handlers (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS). Arbitrary
 * named exports like `resetBootstrapCache` cause a build-time type error.
 */
let cachedBootstrapHash: string | null | undefined = undefined;

/** Reset the cached bootstrap token hash. Used in tests between env var changes. */
export function resetBootstrapCache(): void {
  cachedBootstrapHash = undefined;
}

/** Return the SHA-256 hash of the MCP_INITIAL_TOKEN env var, or null if unset/invalid. */
export function getBootstrapHash(): string | null {
  if (cachedBootstrapHash !== undefined) return cachedBootstrapHash;

  const raw = process.env.MCP_INITIAL_TOKEN?.trim();
  // WHY: minimum length prevents accidental short/whitespace tokens from matching.
  if (!raw || raw.length < MIN_BOOTSTRAP_TOKEN_LENGTH) {
    cachedBootstrapHash = null;
    return null;
  }

  cachedBootstrapHash = createHash('sha256').update(raw).digest('hex');
  return cachedBootstrapHash;
}
