import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, resetRateLimiter } from './rate-limiter';

describe('rate-limiter', () => {
  beforeEach(() => {
    resetRateLimiter();
  });

  it('allows requests within the limit', () => {
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit('test-key', 10, 60_000)).toBe(true);
    }
  });

  it('blocks requests exceeding the limit', () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit('test-key', 10, 60_000);
    }
    expect(checkRateLimit('test-key', 10, 60_000)).toBe(false);
  });

  it('allows requests under different keys independently', () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit('key-a', 10, 60_000);
    }
    // key-a should be blocked
    expect(checkRateLimit('key-a', 10, 60_000)).toBe(false);
    // key-b should still be allowed
    expect(checkRateLimit('key-b', 10, 60_000)).toBe(true);
  });

  it('resets after the window expires', () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit('test-key', 10, 1000);
    }
    expect(checkRateLimit('test-key', 10, 1000)).toBe(false);

    // Advance past the 1-second window
    return new Promise((resolve) => {
      setTimeout(() => {
        expect(checkRateLimit('test-key', 10, 1000)).toBe(true);
        resolve(null);
      }, 1100);
    });
  });

  it('uses default limits when not specified', () => {
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit('default-key')).toBe(true);
    }
    expect(checkRateLimit('default-key')).toBe(false);
  });

  it('resetRateLimiter clears all state', () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit('key-a', 10, 60_000);
    }
    expect(checkRateLimit('key-a', 10, 60_000)).toBe(false);

    resetRateLimiter();
    expect(checkRateLimit('key-a', 10, 60_000)).toBe(true);
  });
});
