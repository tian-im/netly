import type { PrismaClient } from '@prisma/client';

/**
 * Default category configuration for auto-seeding on first import.
 *
 * Each category defines keyword patterns used to create CategoryRule entries
 * for automatic transaction categorization.
 */
export interface DefaultCategoryConfig {
  name: string;
  type: string;
  cashFlowType: string;
  patterns: string[];
}

export const DEFAULT_CATEGORIES: DefaultCategoryConfig[] = [
  // WHY: Include both English and Chinese keyword patterns so users of either locale
  // get auto-categorization. The matchRule engine does case-insensitive substring matching,
  // which works for both Latin and CJK characters.
  { name: 'Salary', type: 'INCOME', cashFlowType: 'OPERATING', patterns: ['salary', 'paycheck', 'payroll', 'direct deposit', '工资', '薪资', '薪水'] },
  { name: 'Groceries', type: 'EXPENSE', cashFlowType: 'OPERATING', patterns: ['woolworths', 'coles', 'aldi', 'grocer', 'supermarket', '超市', '果蔬', '生鲜', '菜市场'] },
  { name: 'Utilities & Internet', type: 'EXPENSE', cashFlowType: 'OPERATING', patterns: ['agl', 'electricity', 'water board', 'optus', 'telstra', 'tpg', '电费', '水费', '燃气', '煤气', '宽带', '网络', '网费'] },
  { name: 'Subscriptions', type: 'EXPENSE', cashFlowType: 'OPERATING', patterns: ['netflix', 'spotify', 'youtube premium', 'aws', 'github', 'icloud', '订阅', '会员', 'vip'] },
  { name: 'Rent & Mortgage', type: 'EXPENSE', cashFlowType: 'OPERATING', patterns: ['rent', 'mortgage', 'real estate', 'housing', '房租', '房贷', '租金', '住房', '租房'] },
  { name: 'Transport & Travel', type: 'EXPENSE', cashFlowType: 'OPERATING', patterns: ['uber', 'taxi', 'petrol', 'caltex', 'shell', 'bp', 'opal', 'train', 'flight', '出租车', '地铁', '公交', '巴士', '汽油', '加油', '机票', '高铁', '火车', '酒店'] },
  { name: 'Investments', type: 'EXPENSE', cashFlowType: 'INVESTING', patterns: ['brokerage', 'coinbase', 'shares', 'vanguard', 'stock', '投资', '股票', '基金', '理财', '证券'] },
  { name: 'Loan Payments', type: 'EXPENSE', cashFlowType: 'FINANCING', patterns: ['loan repayment', 'repayment', 'loan interest', '贷款', '还款', '利息', '借贷'] },
  { name: 'Transfer', type: 'TRANSFER', cashFlowType: 'OPERATING', patterns: ['transfer', 'internal transfer', 'tfr', '转账', '转帐', '内部转账', '转入', '转出'] },
];

/**
 * Seeds default categories and their match rules only when no categories exist.
 * This is idempotent — subsequent calls are no-ops if categories are already present.
 */
export async function seedDefaultCategoriesIfEmpty(prisma: PrismaClient): Promise<void> {
  const categoryCount = await prisma.category.count();
  if (categoryCount === 0) {
    await prisma.$transaction(async (tx) => {
      for (const defaultCat of DEFAULT_CATEGORIES) {
        const cat = await tx.category.create({
          data: {
            name: defaultCat.name,
            type: defaultCat.type,
            cashFlowType: defaultCat.cashFlowType,
          },
        });

        for (const pattern of defaultCat.patterns) {
          await tx.categoryRule.create({
            data: {
              pattern,
              categoryId: cat.id,
            },
          });
        }
      }
    });
  }
}
