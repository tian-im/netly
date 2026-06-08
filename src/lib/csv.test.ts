import { describe, it, expect } from 'vitest';
import { parseCSV, cleanAmount, parseBankDate } from './csv';

describe('CSV Parser Core', () => {
  describe('cleanAmount', () => {
    it('should parse clean floats', () => {
      expect(cleanAmount('123.45')).toBe(123.45);
      expect(cleanAmount('-50.2')).toBe(-50.2);
    });

    it('should handle currency symbols and commas', () => {
      expect(cleanAmount('$1,250.50')).toBe(1250.5);
      expect(cleanAmount('-$500.00')).toBe(-500);
      expect(cleanAmount('£10,000')).toBe(10000);
    });

    it('should handle parentheses as negative values', () => {
      expect(cleanAmount('(120.00)')).toBe(-120);
      expect(cleanAmount('($1,500.50)')).toBe(-1500.5);
    });

    it('should throw or return NaN for invalid values', () => {
      expect(Number.isNaN(cleanAmount('abc'))).toBe(true);
      expect(Number.isNaN(cleanAmount(''))).toBe(true);
    });
  });

  describe('parseBankDate', () => {
    it('should parse standard YYYY-MM-DD dates', () => {
      const date = parseBankDate('2026-06-08');
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(5); // 0-indexed (June)
      expect(date.getDate()).toBe(8);
    });

    it('should parse DD/MM/YYYY dates', () => {
      const date = parseBankDate('08/06/2026');
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(5);
      expect(date.getDate()).toBe(8);
    });

    it('should parse MM/DD/YYYY dates', () => {
      const date = parseBankDate('06/08/2026', 'MM/DD/YYYY');
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(5);
      expect(date.getDate()).toBe(8);
    });

    it('should handle dash separators DD-MM-YYYY', () => {
      const date = parseBankDate('08-06-2026');
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(5);
      expect(date.getDate()).toBe(8);
    });

    it('should handle dash separators with format hints', () => {
      const d1 = parseBankDate('08-06-2026', 'DD-MM-YYYY');
      expect(d1.getFullYear()).toBe(2026);
      expect(d1.getMonth()).toBe(5);
      expect(d1.getDate()).toBe(8);

      const d2 = parseBankDate('06-08-2026', 'MM-DD-YYYY');
      expect(d2.getFullYear()).toBe(2026);
      expect(d2.getMonth()).toBe(5);
      expect(d2.getDate()).toBe(8);
    });

    it('should resolve MM/DD/YYYY fallback when date is unambiguous', () => {
      // Month is 6, Day is 15 (p1 = 6, p2 = 15). isDayFirst should be resolved as false.
      const date = parseBankDate('06/15/2026');
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(5); // June
      expect(date.getDate()).toBe(15);
    });

    it('should throw an error for unparseable dates', () => {
      expect(() => parseBankDate('invalid-date')).toThrow();
    });
  });

  describe('parseCSV', () => {
    const csvContent = `
Date,Merchant,Amount,Details
2026-06-01,Uber,-15.50,Ride to work
2026-06-02,Salary,2500.00,
2026-06-03,Woolworths,-82.40,Groceries
    `.trim();

    it('should parse CSV with exact header matching', () => {
      const headerMap = {
        date: 'Date',
        payee: 'Merchant',
        amount: 'Amount',
        description: 'Details',
      };

      const result = parseCSV(csvContent, headerMap);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        date: expect.any(Date),
        payee: 'Uber',
        amount: -15.5,
        description: 'Ride to work',
      });
      expect(result[0].date.getFullYear()).toBe(2026);
      expect(result[1].payee).toBe('Salary');
      expect(result[1].amount).toBe(2500);
      expect(result[2].payee).toBe('Woolworths');
      expect(result[2].amount).toBe(-82.4);
    });

    it('should handle custom date format hint', () => {
      const csvSlash = `
Date,Merchant,Amount
01/06/2026,Uber,-15.50
      `.trim();

      const headerMap = {
        date: 'Date',
        payee: 'Merchant',
        amount: 'Amount',
        description: 'Details',
      };

      const result = parseCSV(csvSlash, headerMap, 'DD/MM/YYYY');
      expect(result).toHaveLength(1);
      expect(result[0].date.getMonth()).toBe(5); // June
      expect(result[0].date.getDate()).toBe(1);
      expect(result[0].description).toBeNull();
    });

    it('should throw an error if mapped headers are missing', () => {
      const headerMap = {
        date: 'MissingDate',
        payee: 'Merchant',
        amount: 'Amount',
      };

      expect(() => parseCSV(csvContent, headerMap)).toThrow('Required header "MissingDate" not found in CSV');
    });

    it('should skip rows with invalid amount or date and keep working ones', () => {
      const badCsv = `
Date,Merchant,Amount
2026-06-01,Uber,-15.50
2026-06-99,Woolworths,-82.40
2026-06-03,Netflix,invalid_amount
2026-06-04,Airbnb,-450.00
      `.trim();

      const headerMap = {
        date: 'Date',
        payee: 'Merchant',
        amount: 'Amount',
      };

      const result = parseCSV(badCsv, headerMap);
      expect(result).toHaveLength(2);
      expect(result[0].payee).toBe('Uber');
      expect(result[1].payee).toBe('Airbnb');
    });

    it('should skip rows that have missing core columns', () => {
      const badCsv = `
Date,Merchant,Amount
,Uber,-15.50
2026-06-02,,2500.00
2026-06-03,Woolworths,
2026-06-04,Airbnb,-450.00
      `.trim();

      const headerMap = {
        date: 'Date',
        payee: 'Merchant',
        amount: 'Amount',
      };

      const result = parseCSV(badCsv, headerMap);
      expect(result).toHaveLength(1);
      expect(result[0].payee).toBe('Airbnb');
    });

    it('should return empty list if first row is empty', () => {
      const headerMap = {
        date: 'Date',
        payee: 'Merchant',
        amount: 'Amount',
      };
      expect(parseCSV('', headerMap)).toHaveLength(0);
    });

    it('should return empty list if first row does not exist (header only)', () => {
      const headerMap = {
        date: 'Date',
        payee: 'Merchant',
        amount: 'Amount',
      };
      expect(parseCSV('Date,Merchant,Amount', headerMap)).toHaveLength(0);
    });

    it('should throw an error if PapaParse fails with errors', () => {
      const headerMap = {
        date: 'Date',
        payee: 'Merchant',
        amount: 'Amount',
      };
      expect(() => parseCSV('"unclosed quote', headerMap)).toThrow('CSV Parsing failed');
    });

    it('should parse date via standard fallback parser', () => {
      expect(parseBankDate('June 8, 2026').getFullYear()).toBe(2026);
    });
  });
});
