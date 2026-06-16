/** Priority for language tag tie-breaking: zh > en > others */
function tagPriority(tag: string): number {
  if (tag === 'zh') return 0;
  if (tag === 'en') return 1;
  return 2;
}

/**
 * Parse the Accept-Language header to extract the preferred locale.
 * Returns 'en' or 'zh' — all other values fall back to 'en'.
 *
 * Tie-breaking: In the sorted (highest quality first) list, 'zh' is checked
 * before 'en', so if a browser sends both with the same quality (q=1),
 * 'zh' is preferred. This matches the expectation that users who include
 * Chinese in their language preferences (even equally with English) intend
 * to see the Chinese UI.
 */
export function parseAcceptLanguage(acceptLanguage: string | null): 'en' | 'zh' {
  if (!acceptLanguage) return 'en';
  // Parse quality-weighted list: "zh-CN,zh;q=0.9,en;q=0.8"
  const locales = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, q = 'q=1'] = part.trim().split(';');
      const quality = parseFloat(q.replace('q=', '')) || 0;
      return { tag: tag.split('-')[0].toLowerCase(), quality };
    })
    // Tie-breaking: zh before en when equal quality (bilingual users)
    .sort((a, b) => b.quality - a.quality || tagPriority(a.tag) - tagPriority(b.tag));
  // 'zh' is checked first intentionally — if both en and zh have the same
  // quality, zh wins (see doc comment above for rationale).
  for (const { tag } of locales) {
    if (tag === 'zh') return 'zh';
    if (tag === 'en') return 'en';
  }
  return 'en';
}

/**
 * Resolve locale from a Request object by reading the Accept-Language header.
 */
export function resolveLocale(request: Request): 'en' | 'zh' {
  return parseAcceptLanguage(request.headers.get('Accept-Language'));
}

/**
 * Default category definitions for onboarding seeding.
 * Maps locale strings to arrays of category objects.
 *
 * @internal - Prefer `getDefaultCategories(locale)` instead.
 */
export const DEFAULT_CATEGORIES: Record<
  'en' | 'zh',
  Array<{ name: string; type: 'INCOME' | 'EXPENSE' | 'TRANSFER'; cashFlowType: 'OPERATING' | 'INVESTING' | 'FINANCING' }>
> = {
  en: [
    // Income
    { name: 'Salary', type: 'INCOME', cashFlowType: 'OPERATING' },
    { name: 'Freelance', type: 'INCOME', cashFlowType: 'OPERATING' },
    { name: 'Investment Income', type: 'INCOME', cashFlowType: 'INVESTING' },
    { name: 'Gifts Received', type: 'INCOME', cashFlowType: 'OPERATING' },
    { name: 'Other Income', type: 'INCOME', cashFlowType: 'OPERATING' },
    // Expense
    { name: 'Housing & Rent', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: 'Utilities', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: 'Groceries', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: 'Dining Out', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: 'Transportation', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: 'Healthcare', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: 'Insurance', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: 'Shopping', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: 'Entertainment', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: 'Education', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: 'Subscriptions', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: 'Travel', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: 'Gifts & Donations', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: 'Personal Care', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: 'Bank Fees', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: 'Interest Paid', type: 'EXPENSE', cashFlowType: 'FINANCING' },
    { name: 'Other Expense', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    // Transfer (protected)
    { name: 'Transfer', type: 'TRANSFER', cashFlowType: 'OPERATING' },
  ],
  zh: [
    { name: '工资收入', type: 'INCOME', cashFlowType: 'OPERATING' },
    { name: '自由职业', type: 'INCOME', cashFlowType: 'OPERATING' },
    { name: '投资收益', type: 'INCOME', cashFlowType: 'INVESTING' },
    { name: '礼金收入', type: 'INCOME', cashFlowType: 'OPERATING' },
    { name: '其他收入', type: 'INCOME', cashFlowType: 'OPERATING' },
    { name: '住房租金', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '水电煤气', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '食品杂货', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '外出就餐', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '交通出行', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '医疗健康', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '保险费用', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '购物消费', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '休闲娱乐', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '教育学习', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '订阅服务', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '旅行度假', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '礼物捐赠', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '个人护理', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '银行手续费', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '利息支出', type: 'EXPENSE', cashFlowType: 'FINANCING' },
    { name: '其他支出', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '转账', type: 'TRANSFER', cashFlowType: 'OPERATING' },
  ],
};

/**
 * Get locale-appropriate default category names.
 */
export function getDefaultCategories(locale: 'en' | 'zh') {
  return DEFAULT_CATEGORIES[locale] ?? DEFAULT_CATEGORIES.en;
}
