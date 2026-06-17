import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DEFAULT_CATEGORIES, seedDefaultCategoriesIfEmpty } from './default-categories';

describe('default-categories', () => {
  describe('DEFAULT_CATEGORIES', () => {
    it('should have 9 default categories', () => {
      expect(DEFAULT_CATEGORIES).toHaveLength(9);
    });

    it('should have a Transfer category', () => {
      const transfer = DEFAULT_CATEGORIES.find((c) => c.name === 'Transfer');
      expect(transfer).toBeDefined();
      expect(transfer!.type).toBe('TRANSFER');
      expect(transfer!.cashFlowType).toBe('OPERATING');
    });

    it('should have an INCOME category (Salary)', () => {
      const salary = DEFAULT_CATEGORIES.find((c) => c.name === 'Salary');
      expect(salary).toBeDefined();
      expect(salary!.type).toBe('INCOME');
    });

    it('should have categories with all three cashFlowTypes', () => {
      const operating = DEFAULT_CATEGORIES.filter((c) => c.cashFlowType === 'OPERATING');
      const investing = DEFAULT_CATEGORIES.filter((c) => c.cashFlowType === 'INVESTING');
      const financing = DEFAULT_CATEGORIES.filter((c) => c.cashFlowType === 'FINANCING');

      expect(operating.length).toBeGreaterThan(0);
      expect(investing.length).toBeGreaterThan(0);
      expect(financing.length).toBeGreaterThan(0);
    });

    it('should have non-empty patterns for each category', () => {
      for (const cat of DEFAULT_CATEGORIES) {
        expect(cat.patterns.length).toBeGreaterThan(0);
      }
    });
  });

  describe('seedDefaultCategoriesIfEmpty', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('should seed categories and rules when count is 0', async () => {
      const mockTx = {
        category: { create: vi.fn() },
        categoryRule: { create: vi.fn() },
      };
      const mockPrisma = {
        category: { count: vi.fn().mockResolvedValue(0) },
        $transaction: vi.fn(async (cb: (tx: typeof mockTx) => Promise<void>) => {
          await cb(mockTx);
        }),
      } as any;

      // Set up category.create to return incrementing IDs
      let catIndex = 0;
      mockTx.category.create.mockImplementation(({ data }: any) => {
        catIndex++;
        return Promise.resolve({ id: `cat-${catIndex}`, ...data });
      });

      await seedDefaultCategoriesIfEmpty(mockPrisma);

      expect(mockPrisma.category.count).toHaveBeenCalledTimes(1);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      // Should create all 9 categories
      expect(mockTx.category.create).toHaveBeenCalledTimes(9);
      // Should create rules for each category's patterns
      const totalPatterns = DEFAULT_CATEGORIES.reduce((sum, c) => sum + c.patterns.length, 0);
      expect(mockTx.categoryRule.create).toHaveBeenCalledTimes(totalPatterns);
    });

    it('should NOT seed categories when count is > 0', async () => {
      const mockPrisma = {
        category: { count: vi.fn().mockResolvedValue(5) },
        $transaction: vi.fn(),
      } as any;

      await seedDefaultCategoriesIfEmpty(mockPrisma);

      expect(mockPrisma.category.count).toHaveBeenCalledTimes(1);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should not seed if categories already exist (count > 0)', async () => {
      const mockPrisma = {
        category: { count: vi.fn().mockResolvedValue(1) },
        $transaction: vi.fn(),
      } as any;

      await seedDefaultCategoriesIfEmpty(mockPrisma);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
