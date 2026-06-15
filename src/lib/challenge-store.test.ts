import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setChallenge, getChallenge, generateState, setSetupToken, validateAndConsumeSetupToken, resetChallengeStore } from './challenge-store';

describe('challenge-store', () => {
  beforeEach(() => {
    resetChallengeStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('setChallenge / getChallenge', () => {
    it('stores and retrieves a challenge by state', () => {
      const state = generateState();
      setChallenge(state, 'test-challenge');
      expect(getChallenge(state)).toBe('test-challenge');
    });

    it('returns null for unknown state', () => {
      expect(getChallenge('unknown-state')).toBeNull();
    });

    it('removes challenge after retrieval (one-time use)', () => {
      const state = generateState();
      setChallenge(state, 'test-challenge');
      getChallenge(state);
      expect(getChallenge(state)).toBeNull();
    });

    it('returns null for expired challenge', () => {
      const state = generateState();
      setChallenge(state, 'test-challenge');
      vi.advanceTimersByTime(6 * 60 * 1000);
      expect(getChallenge(state)).toBeNull();
    });

    it('keeps non-expired challenge', () => {
      const state = generateState();
      setChallenge(state, 'test-challenge');
      vi.advanceTimersByTime(4 * 60 * 1000);
      expect(getChallenge(state)).toBe('test-challenge');
    });
  });

  describe('generateState', () => {
    it('generates a unique state string', () => {
      const s1 = generateState();
      const s2 = generateState();
      expect(s1).not.toBe(s2);
    });

    it('returns a non-empty string', () => {
      expect(generateState().length).toBeGreaterThan(0);
    });
  });

  describe('setSetupToken / validateAndConsumeSetupToken', () => {
    it('stores and validates a valid token', () => {
      setSetupToken('TOKEN1');
      expect(validateAndConsumeSetupToken('TOKEN1')).toBe(true);
    });

    it('returns false for unknown token', () => {
      expect(validateAndConsumeSetupToken('UNKNOWN')).toBe(false);
    });

    it('removes token after verification (one-time use)', () => {
      setSetupToken('TOKEN2');
      validateAndConsumeSetupToken('TOKEN2');
      expect(validateAndConsumeSetupToken('TOKEN2')).toBe(false);
    });

    it('returns false for expired token', () => {
      setSetupToken('TOKEN3');
      vi.advanceTimersByTime(16 * 60 * 1000);
      expect(validateAndConsumeSetupToken('TOKEN3')).toBe(false);
    });

    it('keeps non-expired token', () => {
      setSetupToken('TOKEN4');
      vi.advanceTimersByTime(14 * 60 * 1000);
      expect(validateAndConsumeSetupToken('TOKEN4')).toBe(true);
    });
  });

  describe('resetChallengeStore', () => {
    it('removes all challenges and setup tokens', () => {
      setChallenge(generateState(), 'test-challenge');
      setSetupToken('TOKEN1');

      resetChallengeStore();

      // All entries should be gone
      expect(getChallenge(generateState())).toBeNull();
      expect(validateAndConsumeSetupToken('TOKEN1')).toBe(false);
    });
  });

  describe('lazy initialisation (globalThis)', () => {
    it('auto-creates the store when not pre-initialised', () => {
      // Simulate a fresh runtime where no store exists yet
      const g = globalThis as any;
      delete g.__netlyChallengeStore;

      const state = generateState();
      setChallenge(state, 'test-challenge');
      expect(getChallenge(state)).toBe('test-challenge');
    });
  });
});
