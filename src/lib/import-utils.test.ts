import { describe, it, expect } from 'vitest';
import { makeHash, disambiguateDescriptions, validateAccountImport, isAccountDuplicate } from './import-utils';
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

  describe('validateAccountImport', () => {
    const supportedCurrencies = new Set(['AUD', 'USD', 'CNY']);

    it('should validate valid account successfully', () => {
      const res = validateAccountImport(
        { name: 'Checking', type: 'ASSET', currency: 'AUD' },
        supportedCurrencies
      );
      expect(res.isValid).toBe(true);
    });

    it('should fail if name is empty or missing', () => {
      const res1 = validateAccountImport({ name: '', type: 'ASSET' }, supportedCurrencies);
      const res2 = validateAccountImport({ type: 'ASSET' }, supportedCurrencies);
      expect(res1.isValid).toBe(false);
      expect(res1.error).toBe('ERR_ACCOUNT_NAME_REQUIRED');
      expect(res2.isValid).toBe(false);
      expect(res2.error).toBe('ERR_ACCOUNT_NAME_REQUIRED');
    });

    it('should fail if type is invalid', () => {
      const res = validateAccountImport(
        { name: 'Checking', type: 'INVALID' },
        supportedCurrencies
      );
      expect(res.isValid).toBe(false);
      expect(res.error).toBe('ERR_INVALID_TYPE');
    });

    it('should fail if currency is not supported', () => {
      const res = validateAccountImport(
        { name: 'Checking', type: 'ASSET', currency: 'EUR' },
        supportedCurrencies
      );
      expect(res.isValid).toBe(false);
      expect(res.error).toBe('ERR_INVALID_CURRENCY');
    });

    it('should fail if ID is present but not a valid UUID', () => {
      const res = validateAccountImport(
        { id: 'not-a-uuid', name: 'Checking', type: 'ASSET' },
        supportedCurrencies
      );
      expect(res.isValid).toBe(false);
      expect(res.error).toBe('ERR_INVALID_ID');
    });

    it('should pass if ID is a valid UUID', () => {
      const res = validateAccountImport(
        { id: '12345678-1234-1234-1234-123456789012', name: 'Checking', type: 'ASSET' },
        supportedCurrencies
      );
      expect(res.isValid).toBe(true);
    });
  });

  describe('isAccountDuplicate', () => {
    it('should return true for DB duplicate ID or name', () => {
      const existingIds = new Set(['id-1']);
      const existingNames = new Set(['checking']);
      const batchIds = new Set<string>();
      const batchNames = new Set<string>();

      const res1 = isAccountDuplicate({ id: 'id-1', name: 'Savings' }, existingIds, existingNames, batchIds, batchNames);
      const res2 = isAccountDuplicate({ name: 'Checking' }, existingIds, existingNames, batchIds, batchNames);
      
      expect(res1.isDuplicate).toBe(true);
      expect(res1.duplicateType).toBe('db');
      expect(res2.isDuplicate).toBe(true);
      expect(res2.duplicateType).toBe('db');
    });

    it('should return true for batch duplicate ID or name', () => {
      const existingIds = new Set<string>();
      const existingNames = new Set<string>();
      const batchIds = new Set(['id-2']);
      const batchNames = new Set(['savings']);

      const res1 = isAccountDuplicate({ id: 'id-2', name: 'Checking' }, existingIds, existingNames, batchIds, batchNames);
      const res2 = isAccountDuplicate({ name: 'Savings' }, existingIds, existingNames, batchIds, batchNames);

      expect(res1.isDuplicate).toBe(true);
      expect(res1.duplicateType).toBe('batch');
      expect(res2.isDuplicate).toBe(true);
      expect(res2.duplicateType).toBe('batch');
    });

    it('should return false for unique accounts', () => {
      const existingIds = new Set(['id-1']);
      const existingNames = new Set(['checking']);
      const batchIds = new Set(['id-2']);
      const batchNames = new Set(['savings']);

      const res = isAccountDuplicate({ id: 'id-3', name: 'Credit' }, existingIds, existingNames, batchIds, batchNames);
      expect(res.isDuplicate).toBe(false);
    });
  });
});
