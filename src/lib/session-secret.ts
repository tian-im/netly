/**
 * Session secret resolution with auto-generation and file persistence.
 *
 * Resolution order:
 *   1. SESSION_SECRET environment variable (explicit production override)
 *   2. SESSION_SECRET_FILE path → read persisted secret from file
 *   3. Default file path based on environment:
 *      - Production: `/app/data/.session-secret` (inside the mounted volume)
 *      - Development: `process.cwd()/.session-secret` (project root)
 *   4. Generate a new 64-hex-char secret and persist it to the resolved file path
 *
 * The file-based persistence means the secret survives server restarts,
 * so existing sessions (cookies) remain valid after a restart. This is
 * important for local development where the Docker container may restart.
 *
 * In production with the default Docker setup:
 *   - `/app/data` is a mounted Docker volume → secret persists across restarts
 *   - No env vars needed (SESSION_SECRET_FILE defaults to /app/data/.session-secret)
 *
 * Advanced overrides:
 *   - Set SESSION_SECRET env var for full control (takes highest precedence)
 *   - Set SESSION_SECRET_FILE env var to customize the persistence path
 */
import fs from 'fs';
import path from 'path';

const SECRET_FILE_NAME = '.session-secret';

/**
 * Resolve the path to the session secret file.
 *
 * Order:
 *   1. SESSION_SECRET_FILE environment variable (explicit path override)
 *   2. Production default: /app/data/.session-secret
 *   3. Development default: path.join(process.cwd(), '.session-secret')
 */
export function getSecretFilePath(): string {
  if (process.env.SESSION_SECRET_FILE) {
    return process.env.SESSION_SECRET_FILE;
  }
  if (process.env.NODE_ENV === 'production') {
    return '/app/data/' + SECRET_FILE_NAME;
  }
  return path.join(process.cwd(), SECRET_FILE_NAME);
}

export function getSessionSecret(): string {
  // 1. Environment variable takes precedence (production override)
  /* v8 ignore next 3 */
  if (process.env.SESSION_SECRET) {
    return process.env.SESSION_SECRET;
  }

  // 2. Try to read from persistent file
  const filePath = getSecretFilePath();
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
    // Ensure the directory exists before writing
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, secret, 'utf-8');
  /* v8 ignore next 3 */
  } catch {
    // Non-fatal: the in-memory secret is valid for this process lifetime
  }

  return secret;
}
