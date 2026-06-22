/** Supported locales */
export type Locale = 'en' | 'zh' | 'zh-TW' | 'ja' | 'ko';

/** All supported locale codes for iteration */
export const SUPPORTED_LOCALES: Locale[] = ['en', 'zh', 'zh-TW', 'ja', 'ko'];

/** Priority for language tag tie-breaking: zh variants > ja > ko > en > others */
function tagPriority(tag: string): number {
  if (tag === 'zh' || tag === 'zh-tw' || tag === 'zh-hant') return 0;
  if (tag === 'ja') return 1;
  if (tag === 'ko') return 2;
  if (tag === 'en') return 3;
  return 4;
}

/**
 * Parse the Accept-Language header to extract the preferred locale.
 * Returns one of 'en', 'zh', 'zh-TW', 'ja', 'ko' — all other values fall back to 'en'.
 *
 * Tie-breaking: In the sorted (highest quality first) list, 'zh' variants are checked
 * before 'en', so if a browser sends both with the same quality (q=1),
 * Chinese is preferred. This matches the expectation that users who include
 * Chinese in their language preferences (even equally with English) intend
 * to see the Chinese UI.
 */
export function parseAcceptLanguage(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return 'en';
  // Parse quality-weighted list: "zh-TW,zh-Hant;q=0.9,en;q=0.8"
  const locales = acceptLanguage
    .split(',')
    .map((part) => {
      const [fullTag, q = 'q=1'] = part.trim().split(';');
      const quality = parseFloat(q.replace('q=', '')) || 0;
      const tag = fullTag.split('-')[0].toLowerCase();
      const fullTagLower = fullTag.toLowerCase();
      return { tag, fullTag: fullTagLower, quality };
    })
    // Tie-breaking: zh before en when equal quality (bilingual users)
    .sort((a, b) => b.quality - a.quality || tagPriority(a.tag) - tagPriority(b.tag));

  // WHY: Two-pass approach is required because zh-CN and zh-TW both map to
  // tag 'zh', but we must detect Traditional Chinese variants first before
  // falling back to Simplified Chinese. A single pass would return 'zh' on
  // the first zh-tagged entry (e.g. zh-CN) even if zh-TW appears later.
  for (const { fullTag, tag } of locales) {
    if (tag === 'zh' && (fullTag === 'zh-tw' || fullTag === 'zh-hant' || fullTag === 'zh-hk' || fullTag === 'zh-mo')) {
      return 'zh-TW';
    }
  }
  for (const { tag } of locales) {
    if (tag === 'zh') return 'zh';
    if (tag === 'ja') return 'ja';
    if (tag === 'ko') return 'ko';
    if (tag === 'en') return 'en';
  }
  return 'en';
}

/**
 * Resolve locale from a Request object by reading the Accept-Language header.
 */
export function resolveLocale(request: Request): Locale {
  return parseAcceptLanguage(request.headers.get('Accept-Language'));
}

/**
 * Default category definitions for onboarding seeding.
 * Maps locale strings to arrays of category objects.
 *
 * @internal - Prefer `getDefaultCategories(locale)` instead.
 */
// WHY: Renamed from DEFAULT_CATEGORIES to LOCALE_DEFAULT_CATEGORIES to avoid
// name collision with default-categories.ts (which exports pattern-based rules
// for the auto-categorization engine). This one is locale-keyed for onboarding seeding.
export const LOCALE_DEFAULT_CATEGORIES: Record<
  Locale,
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
  'zh-TW': [
    { name: '薪資收入', type: 'INCOME', cashFlowType: 'OPERATING' },
    { name: '自由職業', type: 'INCOME', cashFlowType: 'OPERATING' },
    { name: '投資收益', type: 'INCOME', cashFlowType: 'INVESTING' },
    { name: '禮金收入', type: 'INCOME', cashFlowType: 'OPERATING' },
    { name: '其他收入', type: 'INCOME', cashFlowType: 'OPERATING' },
    { name: '房屋租金', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '水電瓦斯', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '食品雜貨', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '外出用餐', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '交通出行', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '醫療保健', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '保險費用', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '購物消費', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '休閒娛樂', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '教育學習', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '訂閱服務', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '旅行度假', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '禮物捐贈', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '個人護理', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '銀行手續費', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '利息支出', type: 'EXPENSE', cashFlowType: 'FINANCING' },
    { name: '其他支出', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '轉帳', type: 'TRANSFER', cashFlowType: 'OPERATING' },
  ],
  ja: [
    { name: '給与収入', type: 'INCOME', cashFlowType: 'OPERATING' },
    { name: 'フリーランス', type: 'INCOME', cashFlowType: 'OPERATING' },
    { name: '投資収益', type: 'INCOME', cashFlowType: 'INVESTING' },
    { name: '贈与収入', type: 'INCOME', cashFlowType: 'OPERATING' },
    { name: 'その他収入', type: 'INCOME', cashFlowType: 'OPERATING' },
    { name: '住宅・家賃', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '光熱費', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '食料品', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '外食', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '交通費', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '医療費', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '保険料', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '買い物', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '娯楽', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '教育', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: 'サブスクリプション', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '旅行', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '贈り物・寄付', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '身だしなみ', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '銀行手数料', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '支払利息', type: 'EXPENSE', cashFlowType: 'FINANCING' },
    { name: 'その他支出', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '振替', type: 'TRANSFER', cashFlowType: 'OPERATING' },
  ],
  ko: [
    { name: '급여', type: 'INCOME', cashFlowType: 'OPERATING' },
    { name: '프리랜서', type: 'INCOME', cashFlowType: 'OPERATING' },
    { name: '투자 수익', type: 'INCOME', cashFlowType: 'INVESTING' },
    { name: '선물 수입', type: 'INCOME', cashFlowType: 'OPERATING' },
    { name: '기타 수입', type: 'INCOME', cashFlowType: 'OPERATING' },
    { name: '주택・임대료', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '공과금', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '식료품', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '외식', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '교통비', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '의료비', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '보험료', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '쇼핑', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '여가', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '교육', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '구독', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '여행', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '선물・기부', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '미용・관리', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '은행 수수료', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '이자 비용', type: 'EXPENSE', cashFlowType: 'FINANCING' },
    { name: '기타 지출', type: 'EXPENSE', cashFlowType: 'OPERATING' },
    { name: '이체', type: 'TRANSFER', cashFlowType: 'OPERATING' },
  ],
};

/**
 * Get locale-appropriate default category names.
 * Falls back to English for any unrecognised locale.
 */
export function getDefaultCategories(locale: Locale) {
  return LOCALE_DEFAULT_CATEGORIES[locale] ?? LOCALE_DEFAULT_CATEGORIES.en;
}
