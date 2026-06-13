/**
 * Challenge and Setup Token store.
 *
 * Uses an in-memory Map for simplicity — challenges and setup tokens are
 * short-lived (5 min / 15 min TTL) so on-disk persistence is unnecessary
 * for a single-user local-first application.
 *
 * If multi-instance deployment or crash-proof in-flight flows are ever
 * required, swap this module for a database-backed implementation.
 */

interface ChallengeEntry {
  challenge: string;
  timestamp: number;
}

interface SetupTokenEntry {
  timestamp: number;
}

// These are intentionally module-scoped (not in globalThis) because
// hot-reload and test isolation are handled by the module system.
const challengeMap = new Map<string, ChallengeEntry>();
const setupTokenMap = new Map<string, SetupTokenEntry>();

const TTL_MS = 5 * 60 * 1000;
const SETUP_TOKEN_TTL_MS = 15 * 60 * 1000;

/** Store a WebAuthn challenge associated with a state key. */
export function setChallenge(state: string, challenge: string): void {
  cleanup();
  challengeMap.set(state, { challenge, timestamp: Date.now() });
}

/** Retrieve and consume a challenge (one-time use). Returns null if not found or expired. */
export function getChallenge(state: string): string | null {
  cleanup();
  const entry = challengeMap.get(state);
  if (!entry) return null;
  challengeMap.delete(state);
  // Age check is redundant since cleanup() removes expired entries first,
  // but kept as defensive programming.
  /* v8 ignore start */
  const age = Date.now() - entry.timestamp;
  if (age > TTL_MS) return null;
  /* v8 ignore end */
  return entry.challenge;
}

/** Remove expired challenges. */
function cleanup(): void {
  const cutoff = Date.now() - TTL_MS;
  for (const [key, entry] of challengeMap) {
    if (entry.timestamp < cutoff) {
      challengeMap.delete(key);
    }
  }
}

/** Store a setup token for device bootstrapping. */
export function setSetupToken(token: string): void {
  cleanupSetupTokens();
  setupTokenMap.set(token, { timestamp: Date.now() });
}

/** Validate and consume a setup token (one-time use). */
export function validateAndConsumeSetupToken(token: string): boolean {
  cleanupSetupTokens();
  const entry = setupTokenMap.get(token);
  if (!entry) return false;
  setupTokenMap.delete(token);
  /* v8 ignore start */
  const age = Date.now() - entry.timestamp;
  if (age > SETUP_TOKEN_TTL_MS) return false;
  /* v8 ignore end */
  return true;
}

/** Remove expired setup tokens. */
function cleanupSetupTokens(): void {
  const cutoff = Date.now() - SETUP_TOKEN_TTL_MS;
  for (const [key, entry] of setupTokenMap) {
    if (entry.timestamp < cutoff) {
      setupTokenMap.delete(key);
    }
  }
}

/** Generate a unique state key for WebAuthn flows. */
export function generateState(): string {
  const ts = Date.now().toString(36);
  const rand = crypto.randomUUID().slice(0, 8);
  return `${ts}_${rand}`;
}
