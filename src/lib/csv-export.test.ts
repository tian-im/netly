import { describe, it, expect, vi } from 'vitest';
import { generateLedgerCSV, generateAccountCSV, downloadCSV } from './csv-export';
import { Transaction } from '@/app/transactions/types';

describe('CSV Export Utility', () => {
  describe('generateLedgerCSV', () => {
    it('should generate a correct CSV string with header and rows', () => {
      const mockTransactions: Transaction[] = [
        {
          id: 'tx_1',
          date: new Date('2026-06-01T00:00:00.000Z'),
          payee: 'Uber',
          description: 'Ride to office',
          amount: -15.5,
          accountId: 'acc_1',
          categoryId: 'cat_1',
          isReviewed: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          account: {
            id: 'acc_1',
            name: 'Checking Account',
            type: 'ASSET',
            startingBalance: 1000,
            currency: 'AUD',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          category: {
            id: 'cat_1',
            name: 'Transport',
            type: 'EXPENSE',
            cashFlowType: 'OPERATING',
          },
        },
        {
          id: 'tx_2',
          date: new Date('2026-06-02T00:00:00.000Z'),
          payee: 'Salary Corp',
          description: null,
          amount: 3000,
          accountId: 'acc_1',
          categoryId: null,
          isReviewed: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          account: {
            id: 'acc_1',
            name: 'Checking Account',
            type: 'ASSET',
            startingBalance: 1000,
            currency: 'AUD',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          category: null,
        },
      ];

      const csv = generateLedgerCSV(mockTransactions);
      
      const expectedLines = [
        'Date,Account,Currency,Payee,Category,Type,Amount,Description',
        '"2026-06-01","Checking Account","AUD","Uber","Transport","EXPENSE",-15.5,"Ride to office"',
        '"2026-06-02","Checking Account","AUD","Salary Corp","Uncategorized","N/A",3000,""'
      ];

      expect(csv).toBe(expectedLines.join('\n'));
    });

    it('should handle double quotes in payee and description correctly', () => {
      const mockTransactions: Transaction[] = [
        {
          id: 'tx_3',
          date: new Date('2026-06-03T00:00:00.000Z'),
          payee: 'Uber "Luxury"',
          description: 'Business "class" ride',
          amount: -50,
          accountId: 'acc_2',
          categoryId: null,
          isReviewed: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          account: {
            id: 'acc_2',
            name: 'Credit Card',
            type: 'LIABILITY',
            startingBalance: 0,
            currency: 'USD',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          category: null,
        },
      ];

      const csv = generateLedgerCSV(mockTransactions);
      const expectedLines = [
        'Date,Account,Currency,Payee,Category,Type,Amount,Description',
        '"2026-06-03","Credit Card","USD","Uber ""Luxury""","Uncategorized","N/A",-50,"Business ""class"" ride"'
      ];

      expect(csv).toBe(expectedLines.join('\n'));
    });
  });

  describe('generateAccountCSV', () => {
    it('should generate a correct CSV string for accounts', () => {
      const mockAccounts = [
        {
          id: 'acc_1',
          name: 'Checking "Primary"',
          type: 'ASSET',
          startingBalance: 1200.5,
          currency: 'AUD',
          createdAt: '2026-06-01T12:00:00.000Z',
        },
      ];

      const csv = generateAccountCSV(mockAccounts);
      const expectedLines = [
        'ID,Name,Type,Starting Balance,Currency,Created At',
        '"acc_1","Checking ""Primary""","ASSET",1200.5,"AUD","2026-06-01"'
      ];

      expect(csv).toBe(expectedLines.join('\n'));
    });

    it('should handle accounts with missing createdAt date', () => {
      const mockAccounts = [
        {
          id: 'acc_2',
          name: 'Credit Card',
          type: 'LIABILITY',
          startingBalance: -500,
          currency: 'AUD',
          createdAt: null,
        },
      ];

      const csv = generateAccountCSV(mockAccounts);
      const expectedLines = [
        'ID,Name,Type,Starting Balance,Currency,Created At',
        '"acc_2","Credit Card","LIABILITY",-500,"AUD",""'
      ];

      expect(csv).toBe(expectedLines.join('\n'));
    });
  });

  describe('downloadCSV', () => {
    it('should create a download link and trigger click in browser', () => {
      
      // Mock URL methods which might not be fully functional in JSDOM
      const originalCreateObjectURL = window.URL.createObjectURL;
      const originalRevokeObjectURL = window.URL.revokeObjectURL;
      
      window.URL.createObjectURL = () => 'blob:http://localhost/mock-uuid';
      window.URL.revokeObjectURL = () => {};

      // Spy on document methods
      const appendSpy = vi.spyOn(document.body, 'appendChild');
      const removeSpy = vi.spyOn(document.body, 'removeChild');

      downloadCSV('test,content', 'test.csv');

      expect(appendSpy).toHaveBeenCalled();
      expect(removeSpy).toHaveBeenCalled();

      // Restore
      window.URL.createObjectURL = originalCreateObjectURL;
      window.URL.revokeObjectURL = originalRevokeObjectURL;
      appendSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });
});
