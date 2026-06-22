import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resetBootstrapCache, getBootstrapHash } from './mcp-bootstrap';

describe('mcp-bootstrap', () => {
  beforeEach(() => {
    resetBootstrapCache();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('getBootstrapHash', () => {
    it('returns null when MCP_INITIAL_TOKEN is not set', () => {
      vi.stubEnv('MCP_INITIAL_TOKEN', '');
      expect(getBootstrapHash()).toBeNull();
    });

    it('returns null when MCP_INITIAL_TOKEN is too short', () => {
      vi.stubEnv('MCP_INITIAL_TOKEN', 'short');
      expect(getBootstrapHash()).toBeNull();
    });

    it('returns SHA-256 hash when MCP_INITIAL_TOKEN is long enough', () => {
      const token = 'my-secret-token-12345678';
      vi.stubEnv('MCP_INITIAL_TOKEN', token);
      const hash = getBootstrapHash();
      expect(hash).not.toBeNull();
      expect(hash).toHaveLength(64); // SHA-256 hex is 64 chars
    });

    it('trims whitespace from the token', () => {
      const token = '  my-secret-token-12345678  ';
      vi.stubEnv('MCP_INITIAL_TOKEN', token);
      const hash = getBootstrapHash();
      expect(hash).not.toBeNull();
      expect(hash).toHaveLength(64);
    });

    it('returns cached value on subsequent calls without recomputing', () => {
      const token = 'my-secret-token-12345678';
      vi.stubEnv('MCP_INITIAL_TOKEN', token);
      const first = getBootstrapHash();
      // Stub env to empty, but cache should still return the old value
      vi.stubEnv('MCP_INITIAL_TOKEN', '');
      const second = getBootstrapHash();
      expect(second).toBe(first); // cached — not null despite empty env
    });

    it('caches null result for short tokens', () => {
      vi.stubEnv('MCP_INITIAL_TOKEN', 'short');
      const first = getBootstrapHash();
      expect(first).toBeNull();
      // Change to valid, but cache should still return null
      vi.stubEnv('MCP_INITIAL_TOKEN', 'my-secret-token-12345678');
      const second = getBootstrapHash();
      expect(second).toBeNull(); // cached null from earlier call
    });
  });

  describe('resetBootstrapCache', () => {
    it('clears the cache so the next call recomputes', () => {
      vi.stubEnv('MCP_INITIAL_TOKEN', 'first-token-1234567890');
      const first = getBootstrapHash();

      resetBootstrapCache();
      vi.stubEnv('MCP_INITIAL_TOKEN', 'second-token-0987654321');
      const second = getBootstrapHash();

      expect(second).not.toBe(first);
      expect(second).not.toBeNull();
    });

    it('clears a cached null result', () => {
      vi.stubEnv('MCP_INITIAL_TOKEN', 'short');
      expect(getBootstrapHash()).toBeNull();

      resetBootstrapCache();
      vi.stubEnv('MCP_INITIAL_TOKEN', 'proper-length-token-here');
      expect(getBootstrapHash()).not.toBeNull();
    });
  });
});
