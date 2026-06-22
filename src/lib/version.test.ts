import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { getAppVersion, resetVersionCache } from './version';
import * as fs from 'fs';
import * as path from 'path';

const versionPath = path.join(process.cwd(), 'VERSION');

describe('version helper', () => {
  let originalVersion: string | null = null;

  beforeAll(() => {
    try {
      originalVersion = fs.readFileSync(versionPath, 'utf-8');
    } catch {
      originalVersion = null;
    }
  });

  afterAll(() => {
    if (originalVersion !== null) {
      fs.writeFileSync(versionPath, originalVersion, 'utf-8');
    } else {
      try {
        fs.unlinkSync(versionPath);
      } catch {}
    }
  });

  beforeEach(() => {
    resetVersionCache();
  });

  it('reads the VERSION file and caches the result', () => {
    fs.writeFileSync(versionPath, '2.4.6\n', 'utf-8');
    
    // First call reads the file
    expect(getAppVersion()).toBe('2.4.6');

    // Change file content on disk to verify cache is used
    fs.writeFileSync(versionPath, '9.9.9\n', 'utf-8');

    // Second call uses cache
    expect(getAppVersion()).toBe('2.4.6');
  });

  it('falls back to 0.0.0 if file read fails', () => {
    try {
      fs.unlinkSync(versionPath);
    } catch {}

    expect(getAppVersion()).toBe('0.0.0');
  });

  it('resets cache correctly when resetVersionCache is called', () => {
    fs.writeFileSync(versionPath, '1.2.3', 'utf-8');

    expect(getAppVersion()).toBe('1.2.3');

    // Change file content on disk
    fs.writeFileSync(versionPath, '4.5.6', 'utf-8');

    // Call reset
    resetVersionCache();

    // After reset, it should read again
    expect(getAppVersion()).toBe('4.5.6');
  });
});
