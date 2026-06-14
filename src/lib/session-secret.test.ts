import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getSessionSecret, getSecretFilePath } from './session-secret';

const SECRET_FILE_NAME = '.session-secret';
const DEV_SECRET_PATH = path.join(process.cwd(), SECRET_FILE_NAME);

describe('session-secret', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    // Clean up the dev test file if it was created
    try { fs.unlinkSync(DEV_SECRET_PATH); } catch { /* ok */ }
  });

  it('returns SESSION_SECRET from environment when set', () => {
    vi.stubEnv('SESSION_SECRET', 'test-override');
    expect(getSessionSecret()).toBe('test-override');
  });

  it('reads existing secret from default dev path', () => {
    const knownSecret = 'aa'.repeat(32); // 64 hex chars
    fs.writeFileSync(DEV_SECRET_PATH, knownSecret, 'utf-8');

    vi.stubEnv('SESSION_SECRET', '');

    expect(getSessionSecret()).toBe(knownSecret);
  });

  it('reads existing secret from SESSION_SECRET_FILE custom path', () => {
    const customPath = path.join(process.cwd(), 'custom-secret-test');
    const knownSecret = 'bb'.repeat(32);
    fs.writeFileSync(customPath, knownSecret, 'utf-8');

    vi.stubEnv('SESSION_SECRET', '');
    vi.stubEnv('SESSION_SECRET_FILE', customPath);

    expect(getSessionSecret()).toBe(knownSecret);

    // Cleanup
    try { fs.unlinkSync(customPath); } catch { /* ok */ }
  });

  it('uses /app/data/.session-secret in production when no env vars set', () => {
    vi.stubEnv('SESSION_SECRET', '');
    vi.stubEnv('SESSION_SECRET_FILE', '');
    vi.stubEnv('NODE_ENV', 'production');

    expect(getSecretFilePath()).toBe('/app/data/.session-secret');
  });

  it('generates and persists a secret when file does not exist', () => {
    // Ensure the dev file doesn't exist
    try { fs.unlinkSync(DEV_SECRET_PATH); } catch { /* ok */ }

    vi.stubEnv('SESSION_SECRET', '');

    const secret = getSessionSecret();
    expect(secret).toBeDefined();
    expect(secret.length).toBeGreaterThanOrEqual(32);
    expect(secret).toMatch(/^[0-9a-f]+$/);

    // Verify the file was created with the same secret
    const fileContent = fs.readFileSync(DEV_SECRET_PATH, 'utf-8').trim();
    expect(fileContent).toBe(secret);
  });

  it('returns consistent secret on repeated calls', () => {
    vi.stubEnv('SESSION_SECRET', '');

    const s1 = getSessionSecret();
    const s2 = getSessionSecret(); // Should read from file
    expect(s1).toBe(s2);
  });

  it('generates secret into directory that does not exist yet', () => {
    const nestedPath = path.join(process.cwd(), 'tmp', 'nested', 'secret-test');
    // Ensure directory does not exist
    try { fs.rmSync(path.dirname(nestedPath), { recursive: true }); } catch { /* ok */ }

    vi.stubEnv('SESSION_SECRET', '');
    vi.stubEnv('SESSION_SECRET_FILE', nestedPath);

    const secret = getSessionSecret();
    expect(secret).toBeDefined();
    expect(secret.length).toBeGreaterThanOrEqual(32);

    // Cleanup
    try { fs.rmSync(path.dirname(path.dirname(nestedPath)), { recursive: true }); } catch { /* ok */ }
  });
});
