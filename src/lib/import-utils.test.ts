import { describe, it, expect } from 'vitest';
import { makeHash, disambiguateDescriptions } from './import-utils';
import type { ParsedTransaction } from './csv';

describe('import-utils', () => {
  describe('makeHash', () => {
    it('should generate consistent hash for same transaction', () => {
      const date = new Date(2026, 5, 15);
      const hash1 = makeHash(date, 'Uber', -15.5, 'Ride to work');
      const hash2 = makeHash(date, 'Uber', -15.5, 'Ride to work');
      expect(hash1).toBe(hash2);
    });

    it('should normalise payee to lowercase trimmed', () => {
      const date = new Date(2026, 5, 15);
      const hash1 = makeHash(date, 'UBER ', -15.5, null);
      const hash2 = makeHash(date, 'uber', -15.5, null);
      expect(hash1).toBe(hash2);
    });

    it('should round amounts to 2 decimal places', () => {
      const date = new Date(2026, 5, 15);
      const hash1 = makeHash(date, 'Test', 12.345, null);
      const hash2 = makeHash(date, 'Test', 12.35, null);
      expect(hash1).toBe(hash2);
    });

    it('should handle null description', () => {
      const date = new Date(2026, 5, 15);
      const hash = makeHash(date, 'Test', 100, null);
      expect(hash).toContain('100.00');
      expect(hash).toContain('_test_');
    });

    it('should handle undefined description', () => {
      const date = new Date(2026, 5, 15);
      const hash = makeHash(date, 'Test', 100, undefined);
      expect(hash).toContain('100.00');
    });

    it('should produce different hashes for different amounts', () => {
      const date = new Date(2026, 5, 15);
      const hash1 = makeHash(date, 'Uber', -15.5, null);
      const hash2 = makeHash(date, 'Uber', -20.0, null);
      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hashes for different payees', () => {
      const date = new Date(2026, 5, 15);
      const hash1 = makeHash(date, 'Uber', -15.5, null);
      const hash2 = makeHash(date, 'Taxi', -15.5, null);
      expect(hash1).not.toBe(hash2);
    });

    it('should normalise description to lowercase trimmed', () => {
      const date = new Date(2026, 5, 15);
      const hash1 = makeHash(date, 'Uber', -15.5, 'Ride ');
      const hash2 = makeHash(date, 'Uber', -15.5, 'ride');
      expect(hash1).toBe(hash2);
    });

    it('should produce .toFixed(2) format (e.g. 15.50 not 15.5)', () => {
      const date = new Date(2026, 5, 15);
      const hash = makeHash(date, 'Test', 15.5, null);
      expect(hash).toContain('_15.50_');
    });

    it('should produce .toFixed(2) for zero (0.00 not 0)', () => {
      const date = new Date(2026, 5, 15);
      const hash = makeHash(date, 'Test', 0, null);
      expect(hash).toContain('_0.00_');
    });
  });

  describe('disambiguateDescriptions', () => {
    it('should do nothing for empty array', () => {
      const txs: ParsedTransaction[] = [];
      disambiguateDescriptions(txs);
      expect(txs).toHaveLength(0);
    });

    it('should do nothing for unique transactions', () => {
      const txs: ParsedTransaction[] = [
        { date: new Date(2026, 5, 1), payee: 'Uber', amount: -15.5, description: 'Ride' },
        { date: new Date(2026, 5, 2), payee: 'Coles', amount: -82.4, description: 'Groceries' },
      ];
      disambiguateDescriptions(txs);
      expect(txs[0].description).toBe('Ride');
      expect(txs[1].description).toBe('Groceries');
    });

    it('should append (2), (3) to duplicate descriptions', () => {
      const txs: ParsedTransaction[] = [
        { date: new Date(2026, 5, 1), payee: 'Uber', amount: -15.5, description: 'Trip' },
        { date: new Date(2026, 5, 1), payee: 'Uber', amount: -15.5, description: 'Trip' },
        { date: new Date(2026, 5, 1), payee: 'Uber', amount: -15.5, description: 'Trip' },
      ];
      disambiguateDescriptions(txs);
      expect(txs[0].description).toBe('Trip'); // First occurrence stays
      expect(txs[1].description).toBe('Trip (2)');
      expect(txs[2].description).toBe('Trip (3)');
    });

    it('should handle null descriptions in duplicates', () => {
      const txs: ParsedTransaction[] = [
        { date: new Date(2026, 5, 1), payee: 'Uber', amount: -15.5, description: null },
        { date: new Date(2026, 5, 1), payee: 'Uber', amount: -15.5, description: null },
      ];
      disambiguateDescriptions(txs);
      expect(txs[0].description).toBeNull();
      expect(txs[1].description).toBe(' (2)');
    });

    it('should not disambiguate transactions with different amounts', () => {
      const txs: ParsedTransaction[] = [
        { date: new Date(2026, 5, 1), payee: 'Uber', amount: -15.5, description: 'Trip' },
        { date: new Date(2026, 5, 1), payee: 'Uber', amount: -20.0, description: 'Trip' },
      ];
      disambiguateDescriptions(txs);
      expect(txs[0].description).toBe('Trip');
      expect(txs[1].description).toBe('Trip');
    });

    it('should not disambiguate transactions with different dates', () => {
      const txs: ParsedTransaction[] = [
        { date: new Date(2026, 5, 1), payee: 'Uber', amount: -15.5, description: 'Trip' },
        { date: new Date(2026, 5, 2), payee: 'Uber', amount: -15.5, description: 'Trip' },
      ];
      disambiguateDescriptions(txs);
      expect(txs[0].description).toBe('Trip');
      expect(txs[1].description).toBe('Trip');
    });

    it('should handle case-insensitive payee matching for duplicates', () => {
      const txs: ParsedTransaction[] = [
        { date: new Date(2026, 5, 1), payee: 'Uber', amount: -15.5, description: 'Trip' },
        { date: new Date(2026, 5, 1), payee: 'uber', amount: -15.5, description: 'Trip' },
      ];
      disambiguateDescriptions(txs);
      expect(txs[0].description).toBe('Trip');
      expect(txs[1].description).toBe('Trip (2)');
    });

    it('should use same key format as makeHash for amount=0 edge case', () => {
      const date = new Date(2026, 5, 1);
      const zeroAmountTx: ParsedTransaction[] = [
        { date, payee: 'Test', amount: 0, description: 'Zero' },
        { date, payee: 'Test', amount: 0, description: 'Zero' },
      ];
      // makeHash produces "0.00" via .toFixed(2)
      const hash = makeHash(date, 'Test', 0, 'Zero');
      expect(hash).toContain('_0.00_');

      // disambiguateDescriptions should recognise the duplicates
      disambiguateDescriptions(zeroAmountTx);
      expect(zeroAmountTx[0].description).toBe('Zero');
      expect(zeroAmountTx[1].description).toBe('Zero (2)');
    });

    it('should use same key format as makeHash for fractional amounts', () => {
      const date = new Date(2026, 5, 1);
      const txs: ParsedTransaction[] = [
        { date, payee: 'Test', amount: 15.5, description: null },
        { date, payee: 'Test', amount: 15.5, description: null },
      ];
      // makeHash produces "15.50" via .toFixed(2)
      const hash = makeHash(date, 'Test', 15.5, null);
      expect(hash).toContain('_15.50_');

      // disambiguateDescriptions should recognise the duplicates
      disambiguateDescriptions(txs);
      expect(txs[0].description).toBeNull();
      expect(txs[1].description).toBe(' (2)');
    });
  });
});
