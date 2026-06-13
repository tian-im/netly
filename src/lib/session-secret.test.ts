import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

const SECRET_FILE = '.session-secret';
const SECRET_PATH = path.join(process.cwd(), SECRET_FILE);

describe('session-secret', () => {
  const ORIGINAL_SECRET = process.env.SESSION_SECRET;

  beforeEach(() => {
    process.env.SESSION_SECRET = 'test-override';
    vi.resetModules();
  });

  afterEach(() => {
    process.env.SESSION_SECRET = ORIGINAL_SECRET;
    vi.resetModules();
    // Clean up the test file if it was created
    try { fs.unlinkSync(SECRET_PATH); } catch { /* ok */ }
  });

  it('returns SESSION_SECRET from environment when set', async () => {
    const { getSessionSecret } = await import('./session-secret');
    expect(getSessionSecret()).toBe('test-override');
  });

  it('reads existing secret from .session-secret file', async () => {
    const knownSecret = 'aa'.repeat(32); // 64 hex chars
    fs.writeFileSync(SECRET_PATH, knownSecret, 'utf-8');

    process.env.SESSION_SECRET = '';
    vi.resetModules();
    const { getSessionSecret } = await import('./session-secret');

    expect(getSessionSecret()).toBe(knownSecret);
  });

  it('generates and persists a secret when file does not exist', async () => {
    // Ensure the file doesn't exist
    try { fs.unlinkSync(SECRET_PATH); } catch { /* ok */ }

    process.env.SESSION_SECRET = '';
    vi.resetModules();
    const { getSessionSecret } = await import('./session-secret');

    const secret = getSessionSecret();
    expect(secret).toBeDefined();
    expect(secret.length).toBeGreaterThanOrEqual(32);
    expect(secret).toMatch(/^[0-9a-f]+$/);

    // Verify the file was created with the same secret
    const fileContent = fs.readFileSync(SECRET_PATH, 'utf-8').trim();
    expect(fileContent).toBe(secret);
  });

  it('returns consistent secret on repeated calls', async () => {
    process.env.SESSION_SECRET = '';
    vi.resetModules();
    const { getSessionSecret } = await import('./session-secret');

    const s1 = getSessionSecret();
    const s2 = getSessionSecret(); // Should read from file
    expect(s1).toBe(s2);
  });
});
