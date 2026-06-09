interface ChallengeEntry {
  challenge: string;
  timestamp: number;
}

interface SetupTokenEntry {
  timestamp: number;
}

declare global {
  var globalChallengeMap: Map<string, ChallengeEntry> | undefined;
  var globalSetupTokenMap: Map<string, SetupTokenEntry> | undefined;
}

const stateMap = globalThis.globalChallengeMap ?? new Map<string, ChallengeEntry>();
const setupTokenMap = globalThis.globalSetupTokenMap ?? new Map<string, SetupTokenEntry>();

if (process.env.NODE_ENV !== 'production') {
  globalThis.globalChallengeMap = stateMap;
  globalThis.globalSetupTokenMap = setupTokenMap;
}

const TTL_MS = 5 * 60 * 1000;
const SETUP_TOKEN_TTL_MS = 15 * 60 * 1000;

export function setChallenge(state: string, challenge: string): void {
  cleanup();
  stateMap.set(state, { challenge, timestamp: Date.now() });
}

export function getChallenge(state: string): string | null {
  cleanup();
  const entry = stateMap.get(state);
  if (!entry) return null;
  stateMap.delete(state);
  return entry.challenge;
}

function cleanup(): void {
  const cutoff = Date.now() - TTL_MS;
  for (const [key, entry] of stateMap) {
    if (entry.timestamp < cutoff) {
      stateMap.delete(key);
    }
  }
}

export function setSetupToken(token: string): void {
  cleanupSetupTokens();
  setupTokenMap.set(token, { timestamp: Date.now() });
}

export function validateAndConsumeSetupToken(token: string): boolean {
  cleanupSetupTokens();
  const entry = setupTokenMap.get(token);
  if (!entry) return false;
  setupTokenMap.delete(token);
  return true;
}

function cleanupSetupTokens(): void {
  const cutoff = Date.now() - SETUP_TOKEN_TTL_MS;
  for (const [key, entry] of setupTokenMap) {
    if (entry.timestamp < cutoff) {
      setupTokenMap.delete(key);
    }
  }
}

export function generateState(): string {
  const ts = Date.now().toString(36);
  const rand = crypto.randomUUID().slice(0, 8);
  return `${ts}_${rand}`;
}
