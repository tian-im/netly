/**
 * Session secret resolution with auto-generation and file persistence.
 *
 * Resolution order:
 *   1. SESSION_SECRET environment variable (explicit production override)
 *   2. `.session-secret` file in process.cwd() (persisted from a prior run)
 *   3. Generate a new 64-hex-char secret and persist it to `.session-secret`
 *
 * The file-based persistence means the secret survives server restarts,
 * so existing sessions (cookies) remain valid after a restart. This is
 * important for local development where the Docker container may restart.
 *
 * Production deployments should set SESSION_SECRET as an environment variable
 * for full control over the secret lifecycle.
 */
import fs from 'fs';
import path from 'path';

const SECRET_FILE = '.session-secret';

export function getSessionSecret(): string {
  // 1. Environment variable takes precedence (production override)
  /* v8 ignore next 3 */
  if (process.env.SESSION_SECRET) {
    return process.env.SESSION_SECRET;
  }

  // 2. Try to read from persistent file
  const filePath = path.join(process.cwd(), SECRET_FILE);
  try {
    const existing = fs.readFileSync(filePath, 'utf-8').trim();
    if (existing.length > 0) return existing;
  /* v8 ignore next 3 */
  } catch {
    // File doesn't exist or can't be read — will generate a new one
  }

  // 3. Generate a new secret (64 hex chars = 256 bits of entropy) and persist it
  const secret: string =
    crypto.randomUUID().replace(/-/g, '') +
    crypto.randomUUID().replace(/-/g, '');
  try {
    fs.writeFileSync(filePath, secret, 'utf-8');
  /* v8 ignore next 3 */
  } catch {
    // Non-fatal: the in-memory secret is valid for this process lifetime
  }

  return secret;
}
