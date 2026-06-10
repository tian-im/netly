import { describe, it, expect } from 'vitest';
import { parseCSV, cleanAmount, parseBankDate, getRowValue } from './csv';

describe('CSV Parser Core', () => {
  describe('getRowValue', () => {
    it('should get value from an array row', () => {
      expect(getRowValue(['a', 'b', 'c'], '0')).toBe('a');
      expect(getRowValue(['a', 'b', 'c'], '1')).toBe('b');
      expect(getRowValue(['a', 'b', 'c'], '2')).toBe('c');
    });

    it('should return empty string for out-of-bounds index', () => {
      expect(getRowValue(['a', 'b'], '5')).toBe('');
    });

    it('should return empty string for negative index', () => {
      expect(getRowValue(['a', 'b'], '-1')).toBe('');
    });

    it('should return empty string for invalid index', () => {
      expect(getRowValue(['a', 'b'], 'abc')).toBe('');
    });

    it('should handle undefined array element via fallback', () => {
      const sparse: string[] = ['a'];
      (sparse as any)[1] = undefined;
      expect(getRowValue(sparse, '1')).toBe('');
    });

    it('should get value from an object row', () => {
      expect(getRowValue({ date: '2026-01-01', payee: 'Test' }, 'date')).toBe('2026-01-01');
      expect(getRowValue({ date: '2026-01-01', payee: 'Test' }, 'payee')).toBe('Test');
    });

    it('should handle undefined object property via fallback', () => {
      expect(getRowValue({ date: '2026-01-01' } as any, 'missing')).toBe('');
    });
  });

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

    it('should handle additional global currency symbols', () => {
      expect(cleanAmount('¥2,500')).toBe(2500);
      expect(cleanAmount('₩1,000')).toBe(1000);
      expect(cleanAmount('₹500.50')).toBe(500.5);
      expect(cleanAmount('€99.90')).toBe(99.9);
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

    it('should reject invalid ISO date with roll-over guard', () => {
      // day=99 rolls over in Date constructor; the roll-over guard must reject it
      expect(() => parseBankDate('2026-06-99')).toThrow('Invalid ISO date');
      // month=13 also rolls over
      expect(() => parseBankDate('2026-13-01')).toThrow('Invalid ISO date');
      // day=0 is out of range
      expect(() => parseBankDate('2026-06-00')).toThrow('Invalid ISO date');
    });

    it('should parse user format like "03 Jun 26"', () => {
      const date = parseBankDate('03 Jun 26');
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(5); // June
      expect(date.getDate()).toBe(3);
    });

    it('should parse DD/MM/YYYY dates', () => {
      const date = parseBankDate('08/06/2026');
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(5);
      expect(date.getDate()).toBe(8);
    });

    it('should detect DD/MM/YYYY when day > 12', () => {
      // p1=13 > 12 → unambiguous DD/MM/YYYY
      const date = parseBankDate('13/06/2026');
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(5); // June
      expect(date.getDate()).toBe(13);
    });

    it('should detect MM/DD/YYYY when day > 12 in second position', () => {
      // p2=13 > 12 while p1=6 ≤ 12 → unambiguous MM/DD/YYYY
      const date = parseBankDate('06/13/2026');
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(5); // June
      expect(date.getDate()).toBe(13);
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

    it('should disambiguate ambiguous date like 03/04/2026 as DD/MM by default', () => {
      // Both parts ≤ 12: DD/MM gets priority per our heuristic
      const date = parseBankDate('03/04/2026');
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(3); // April (0-indexed)
      expect(date.getDate()).toBe(3);
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

      const headerMapMissingAmount = {
        date: 'Date',
        payee: 'Merchant',
        amount: 'MissingAmount',
      };
      expect(() => parseCSV(csvContent, headerMapMissingAmount)).toThrow('Required header "MissingAmount" not found in CSV');
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

    it('should round amounts to the nearest cent consistently', () => {
      expect(cleanAmount('12.344')).toBe(12.34);
      // Note: 12.345 is represented as 12.345000000000000639 in V8/Node.js,
      // so 12.345 * 100 = 1234.5 exactly, and Math.round(1234.5) = 1235.
      // This behavior is platform-dependent (IEEE 754).
      expect(cleanAmount('12.345')).toBe(12.35);
      expect(cleanAmount('12.346')).toBe(12.35);
      expect(cleanAmount('-12.345')).toBe(-12.35);
    });

    it('should parse CSV with separate Debit and Credit columns', () => {
      const csvSplitContent = `
Date,Merchant,Debit,Credit,Details
2026-06-01,Uber,15.50,,Ride to work
2026-06-02,Salary,,2500.00,
2026-06-03,Transfer,10.00,10.00,
2026-06-04,Refund,,15.253,
2026-06-05,DebitOnly,12.50,0.00,
2026-06-06,CreditOnly,0.00,45.00,
      `.trim();

      const headerMap = {
        date: 'Date',
        payee: 'Merchant',
        debit: 'Debit',
        credit: 'Credit',
        description: 'Details',
      };

      const result = parseCSV(csvSplitContent, headerMap);
      expect(result).toHaveLength(6);
      
      // Debit only (negative amount)
      expect(result[0]).toEqual({
        date: expect.any(Date),
        payee: 'Uber',
        amount: -15.5,
        description: 'Ride to work',
      });
      
      // Credit only (positive amount)
      expect(result[1].payee).toBe('Salary');
      expect(result[1].amount).toBe(2500);

      // Both present: 10.00 credit - 10.00 debit = 0 amount
      expect(result[2].payee).toBe('Transfer');
      expect(result[2].amount).toBe(0);

      // Cent rounding on separate credit column
      expect(result[3].payee).toBe('Refund');
      expect(result[3].amount).toBe(15.25);

      // Both present, but credit is 0, debit is non-zero
      expect(result[4].payee).toBe('DebitOnly');
      expect(result[4].amount).toBe(-12.5);

      // Both present, but debit is 0, credit is non-zero
      expect(result[5].payee).toBe('CreditOnly');
      expect(result[5].amount).toBe(45);
    });

    it('should parse CSV with only Debit column mapped', () => {
      const csvDebitOnly = `Date,Merchant,Debit\n2026-06-01,Uber,15.50`;
      const headerMap = {
        date: 'Date',
        payee: 'Merchant',
        debit: 'Debit',
      };
      const result = parseCSV(csvDebitOnly, headerMap);
      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(-15.5);
    });

    it('should parse CSV with only Credit column mapped', () => {
      const csvCreditOnly = `Date,Merchant,Credit\n2026-06-01,Uber,15.50`;
      const headerMap = {
        date: 'Date',
        payee: 'Merchant',
        credit: 'Credit',
      };
      const result = parseCSV(csvCreditOnly, headerMap);
      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(15.5);
    });

    it('should throw an error if mapped debit or credit header is missing', () => {
      const badDebitMap = {
        date: 'Date',
        payee: 'Merchant',
        debit: 'MissingDebit',
        credit: 'Credit',
      };
      expect(() => parseCSV(csvContent, badDebitMap)).toThrow('Debit header "MissingDebit" not found in CSV');

      const badCreditMap = {
        date: 'Date',
        payee: 'Merchant',
        debit: 'Debit',
        credit: 'MissingCredit',
      };
      // We need a CSV with Debit column so it doesn't throw on Debit first
      const csvWithDebit = `Date,Merchant,Debit\n2026-06-01,Uber,10.00`;
      expect(() => parseCSV(csvWithDebit, badCreditMap)).toThrow('Credit header "MissingCredit" not found in CSV');
    });

    it('should throw an error if neither amount nor debit/credit are mapped', () => {
      const headerMap = {
        date: 'Date',
        payee: 'Merchant',
      };
      expect(() => parseCSV(csvContent, headerMap)).toThrow('Either Amount column or Debit/Credit columns must be mapped');
    });

    describe('headerless CSV parsing', () => {
      it('should parse CSV without headers using column indices', () => {
        const headerlessCsv = `2026-06-01,Uber,-15.50,Ride to work
2026-06-02,Salary,2500.00,
2026-06-03,Woolworths,-82.40,Groceries`;

        const colMapping = {
          date: '0',
          payee: '1',
          amount: '2',
          description: '3',
        };

        const result = parseCSV(headerlessCsv, colMapping, undefined, false);
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

      it('should parse headerless CSV with date format hint', () => {
        const headerlessCsv = `01/06/2026,Uber,-15.50`;

        const colMapping = {
          date: '0',
          payee: '1',
          amount: '2',
        };

        const result = parseCSV(headerlessCsv, colMapping, 'DD/MM/YYYY', false);
        expect(result).toHaveLength(1);
        expect(result[0].date.getMonth()).toBe(5);
        expect(result[0].date.getDate()).toBe(1);
      });

      it('should parse headerless CSV with separate debit/credit columns', () => {
        const headerlessCsv = `2026-06-01,Uber,15.50,,Ride to work
2026-06-02,Salary,,2500.00,`;

        const colMapping = {
          date: '0',
          payee: '1',
          debit: '2',
          credit: '3',
          description: '4',
        };

        const result = parseCSV(headerlessCsv, colMapping, undefined, false);
        expect(result).toHaveLength(2);
        expect(result[0].payee).toBe('Uber');
        expect(result[0].amount).toBe(-15.5);
        expect(result[1].payee).toBe('Salary');
        expect(result[1].amount).toBe(2500);
      });

      it('should skip incomplete rows in headerless CSV', () => {
        const headerlessCsv = `2026-06-01,Uber,-15.50
,Netflix,-10.00
2026-06-03,,45.00`;

        const colMapping = {
          date: '0',
          payee: '1',
          amount: '2',
        };

        const result = parseCSV(headerlessCsv, colMapping, undefined, false);
        expect(result).toHaveLength(1);
        expect(result[0].payee).toBe('Uber');
      });

      it('should return empty array for empty headerless CSV', () => {
        const colMapping = { date: '0', payee: '1', amount: '2' };
        expect(parseCSV('', colMapping, undefined, false)).toHaveLength(0);
      });

      it('should skip rows with invalid amounts in headerless CSV', () => {
        const headerlessCsv = `2026-06-01,Uber,-15.50
2026-06-02,Netflix,invalid_amount`;

        const colMapping = {
          date: '0',
          payee: '1',
          amount: '2',
        };

        const result = parseCSV(headerlessCsv, colMapping, undefined, false);
        expect(result).toHaveLength(1);
        expect(result[0].payee).toBe('Uber');
      });

      it('should handle out-of-bounds column indices gracefully', () => {
        const headerlessCsv = `2026-06-01,Uber`;

        const colMapping = {
          date: '0',
          payee: '1',
          amount: '2', // column 2 doesn't exist
        };

        const result = parseCSV(headerlessCsv, colMapping, undefined, false);
        expect(result).toHaveLength(0);
      });

      it('should throw on non-numeric column index in headerless mode', () => {
        const colMapping = {
          date: 'date', // should be a number like '0', not 'date'
          payee: '1',
          amount: '2',
        };
        expect(() => parseCSV('a,b,c', colMapping, undefined, false))
          .toThrow('Invalid column index');
      });

      it('should throw on negative column index in headerless mode', () => {
        const colMapping = {
          date: '-1',
          payee: '1',
          amount: '2',
        };
        expect(() => parseCSV('a,b,c', colMapping, undefined, false))
          .toThrow('Invalid column index');
      });
    });
  });
});
