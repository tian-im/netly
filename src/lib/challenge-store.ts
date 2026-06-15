/**
 * Challenge and Setup Token store.
 *
 * Uses in-memory Maps anchored to `globalThis` so that all Next.js route
 * handler chunks (which compile independently in development mode) share
 * the same store instance.  Without this, module-scoped Maps end up in
 * separate chunk scopes, causing "Challenge expired or invalid" errors
 * when the /begin and /complete routes land in different compilations.
 *
 * Challenges have a 5-minute TTL; setup tokens have a 15-minute TTL.
 * Both are one-time-use (consumed on retrieval) and cleaned up lazily.
 */

interface ChallengeEntry {
  challenge: string;
  timestamp: number;
}

interface SetupTokenEntry {
  timestamp: number;
}

interface ChallengeStore {
  challengeMap: Map<string, ChallengeEntry>;
  setupTokenMap: Map<string, SetupTokenEntry>;
}

function getStore(): ChallengeStore {
  const g = globalThis as typeof globalThis & { __netlyChallengeStore?: ChallengeStore };
  if (!g.__netlyChallengeStore) {
    g.__netlyChallengeStore = {
      challengeMap: new Map(),
      setupTokenMap: new Map(),
    };
  }
  return g.__netlyChallengeStore;
}

const TTL_MS = 5 * 60 * 1000;
const SETUP_TOKEN_TTL_MS = 15 * 60 * 1000;

/** Store a WebAuthn challenge associated with a state key. */
export function setChallenge(state: string, challenge: string): void {
  cleanup();
  getStore().challengeMap.set(state, { challenge, timestamp: Date.now() });
}

/** Retrieve and consume a challenge (one-time use). Returns null if not found or expired. */
export function getChallenge(state: string): string | null {
  cleanup();
  const store = getStore();
  const entry = store.challengeMap.get(state);
  if (!entry) return null;
  store.challengeMap.delete(state);
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
  const { challengeMap } = getStore();
  for (const [key, entry] of challengeMap) {
    if (entry.timestamp < cutoff) {
      challengeMap.delete(key);
    }
  }
}

/** Store a setup token for device bootstrapping. */
export function setSetupToken(token: string): void {
  cleanupSetupTokens();
  getStore().setupTokenMap.set(token, { timestamp: Date.now() });
}

/** Validate and consume a setup token (one-time use). */
export function validateAndConsumeSetupToken(token: string): boolean {
  cleanupSetupTokens();
  const store = getStore();
  const entry = store.setupTokenMap.get(token);
  if (!entry) return false;
  store.setupTokenMap.delete(token);
  /* v8 ignore start */
  const age = Date.now() - entry.timestamp;
  if (age > SETUP_TOKEN_TTL_MS) return false;
  /* v8 ignore end */
  return true;
}

/** Remove expired setup tokens. */
function cleanupSetupTokens(): void {
  const cutoff = Date.now() - SETUP_TOKEN_TTL_MS;
  const { setupTokenMap } = getStore();
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

/** Reset the challenge and setup token stores — for test isolation. */
export function resetChallengeStore(): void {
  const g = globalThis as typeof globalThis & { __netlyChallengeStore?: ChallengeStore };
  g.__netlyChallengeStore = {
    challengeMap: new Map(),
    setupTokenMap: new Map(),
  };
}
