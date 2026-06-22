import { readFileSync } from 'fs';
import { join } from 'path';

let cachedVersion: string | null = null;

export function getAppVersion(): string {
  if (cachedVersion !== null) return cachedVersion;
  try {
    cachedVersion = readFileSync(join(process.cwd(), 'VERSION'), 'utf-8').trim();
  } catch {
    cachedVersion = '0.0.0';
  }
  return cachedVersion;
}

// Exposed for tests that need to clear between assertions
export function resetVersionCache(): void {
  cachedVersion = null;
}
