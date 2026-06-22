import { describe, it, expect } from 'vitest';
import { parseAcceptLanguage, resolveLocale, LOCALE_DEFAULT_CATEGORIES, getDefaultCategories, SUPPORTED_LOCALES } from './locale';

describe('parseAcceptLanguage', () => {
  it('returns "en" for null input', () => {
    expect(parseAcceptLanguage(null)).toBe('en');
  });

  it('returns "en" for undefined/empty input', () => {
    expect(parseAcceptLanguage('')).toBe('en');
  });

  it('parses Simplified Chinese Accept-Language header', () => {
    expect(parseAcceptLanguage('zh-CN,zh;q=0.9,en;q=0.8')).toBe('zh');
  });

  it('parses Traditional Chinese Accept-Language header', () => {
    expect(parseAcceptLanguage('zh-TW,zh-Hant;q=0.9,en;q=0.8')).toBe('zh-TW');
  });

  it('parses zh-TW without region tag', () => {
    expect(parseAcceptLanguage('zh-TW;q=0.9,en;q=0.8')).toBe('zh-TW');
  });

  it('parses zh-Hant as Traditional Chinese', () => {
    expect(parseAcceptLanguage('zh-Hant;q=0.9,en;q=0.8')).toBe('zh-TW');
  });

  it('parses zh-HK as Traditional Chinese', () => {
    expect(parseAcceptLanguage('zh-HK;q=0.9,en;q=0.8')).toBe('zh-TW');
  });

  it('parses English-first Accept-Language header', () => {
    expect(parseAcceptLanguage('en-US,en;q=0.9')).toBe('en');
  });

  it('parses Japanese Accept-Language header', () => {
    expect(parseAcceptLanguage('ja-JP,ja;q=0.9,en;q=0.5')).toBe('ja');
  });

  it('parses Korean Accept-Language header', () => {
    expect(parseAcceptLanguage('ko-KR,ko;q=0.9,en;q=0.5')).toBe('ko');
  });

  it('prefers zh over en when both have equal quality', () => {
    expect(parseAcceptLanguage('en-US,en;q=1,zh-CN,zh;q=1')).toBe('zh');
  });

  it('prefers ja over en when both have equal quality', () => {
    expect(parseAcceptLanguage('en-US,en;q=1,ja-JP,ja;q=1')).toBe('ja');
  });

  it('prefers ko over en when both have equal quality', () => {
    expect(parseAcceptLanguage('en-US,en;q=1,ko-KR,ko;q=1')).toBe('ko');
  });

  it('handles malformed quality values gracefully', () => {
    expect(parseAcceptLanguage('en;q=invalid,zh;q=0.9')).toBe('zh');
  });

  it('handles single language tag without quality', () => {
    expect(parseAcceptLanguage('zh')).toBe('zh');
    expect(parseAcceptLanguage('en')).toBe('en');
    expect(parseAcceptLanguage('ja')).toBe('ja');
    expect(parseAcceptLanguage('ko')).toBe('ko');
  });

  it('falls back to "en" for unsupported languages', () => {
    expect(parseAcceptLanguage('fr-FR')).toBe('en');
  });

  it('handles unsupported language tags at equal quality', () => {
    // 'fr' at quality 1 should not affect the result — falls through to en
    expect(parseAcceptLanguage('fr;q=1,en;q=1')).toBe('en');
  });

  it('handles complex quality-weighted list correctly', () => {
    // zh at 0.5 is lower than en at 0.9, so en wins
    expect(parseAcceptLanguage('fr;q=0.1,en;q=0.9,zh;q=0.5')).toBe('en');
    // en at 0.3 is lower than zh at 0.8, so zh wins
    expect(parseAcceptLanguage('zh;q=0.8,en;q=0.3')).toBe('zh');
  });

  it('sorts en before zh in header but zh wins at equal quality', () => {
    // en appears before zh, both at q=1, but tie-breaking prefers zh
    expect(parseAcceptLanguage('en-US,en;q=1,zh-CN,zh;q=1')).toBe('zh');
  });

  it('handles mixed-case language tags', () => {
    expect(parseAcceptLanguage('ZH-CN,ZH;q=0.9,EN;q=0.8')).toBe('zh');
    expect(parseAcceptLanguage('EN-US,EN;q=0.9')).toBe('en');
    expect(parseAcceptLanguage('JA-JP,JA;q=0.9,EN;q=0.8')).toBe('ja');
    expect(parseAcceptLanguage('KO-KR,KO;q=0.9,EN;q=0.8')).toBe('ko');
  });

  it('prefers zh-TW over zh when both present with equal quality', () => {
    expect(parseAcceptLanguage('zh-CN,zh;q=1,zh-TW,zh-Hant;q=1,en;q=1')).toBe('zh-TW');
  });

  it('prefers ja over ko when user has both but ja has higher quality', () => {
    expect(parseAcceptLanguage('ja;q=0.9,ko;q=0.5,en;q=0.3')).toBe('ja');
  });
});

describe('resolveLocale', () => {
  it('reads Accept-Language header from a Request object', () => {
    const req = new Request('http://localhost', {
      headers: { 'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8' },
    });
    expect(resolveLocale(req)).toBe('zh');
  });

  it('returns en for Request without Accept-Language', () => {
    const req = new Request('http://localhost');
    expect(resolveLocale(req)).toBe('en');
  });

  it('returns ja for Request with Japanese Accept-Language', () => {
    const req = new Request('http://localhost', {
      headers: { 'Accept-Language': 'ja-JP,ja;q=0.9' },
    });
    expect(resolveLocale(req)).toBe('ja');
  });

  it('returns ko for Request with Korean Accept-Language', () => {
    const req = new Request('http://localhost', {
      headers: { 'Accept-Language': 'ko-KR,ko;q=0.9' },
    });
    expect(resolveLocale(req)).toBe('ko');
  });

  it('returns zh-TW for Request with Traditional Chinese Accept-Language', () => {
    const req = new Request('http://localhost', {
      headers: { 'Accept-Language': 'zh-TW,zh-Hant;q=0.9' },
    });
    expect(resolveLocale(req)).toBe('zh-TW');
  });
});

describe('getDefaultCategories', () => {
  it('returns English categories for en locale', () => {
    const cats = getDefaultCategories('en');
    expect(cats).toHaveLength(23);
    expect(cats[0].name).toBe('Salary');
  });

  it('returns Simplified Chinese categories for zh locale', () => {
    const cats = getDefaultCategories('zh');
    expect(cats).toHaveLength(23);
    expect(cats[0].name).toBe('工资收入');
  });

  it('returns Traditional Chinese categories for zh-TW locale', () => {
    const cats = getDefaultCategories('zh-TW');
    expect(cats).toHaveLength(23);
    expect(cats[0].name).toBe('薪資收入');
  });

  it('returns Japanese categories for ja locale', () => {
    const cats = getDefaultCategories('ja');
    expect(cats).toHaveLength(23);
    expect(cats[0].name).toBe('給与収入');
  });

  it('returns Korean categories for ko locale', () => {
    const cats = getDefaultCategories('ko');
    expect(cats).toHaveLength(23);
    expect(cats[0].name).toBe('급여');
  });

  it('falls back to English for unknown locale', () => {
    const cats = getDefaultCategories('fr' as any);
    expect(cats).toHaveLength(23);
    expect(cats[0].name).toBe('Salary');
  });
});

describe('LOCALE_DEFAULT_CATEGORIES', () => {
  it('has all supported locales', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(LOCALE_DEFAULT_CATEGORIES[locale]).toHaveLength(23);
    }
  });

  it('has matching category types across all locales', () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (let i = 0; i < LOCALE_DEFAULT_CATEGORIES.en.length; i++) {
        expect(LOCALE_DEFAULT_CATEGORIES[locale][i].type).toBe(LOCALE_DEFAULT_CATEGORIES.en[i].type);
        expect(LOCALE_DEFAULT_CATEGORIES[locale][i].cashFlowType).toBe(LOCALE_DEFAULT_CATEGORIES.en[i].cashFlowType);
      }
    }
  });

  it('contains exactly one TRANSFER category (protected) in all locales', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const transfers = LOCALE_DEFAULT_CATEGORIES[locale].filter((c) => c.type === 'TRANSFER');
      expect(transfers).toHaveLength(1);
    }
  });

  it('has Income categories with correct types', () => {
    const incomeTypes = new Set(LOCALE_DEFAULT_CATEGORIES.en.filter((c) => c.type === 'INCOME').map((c) => c.type));
    expect(incomeTypes.size).toBe(1);
    expect(incomeTypes.has('INCOME')).toBe(true);
  });

  it('has Expense categories with correct types', () => {
    const expenseTypes = new Set(LOCALE_DEFAULT_CATEGORIES.en.filter((c) => c.type === 'EXPENSE').map((c) => c.type));
    expect(expenseTypes.size).toBe(1);
    expect(expenseTypes.has('EXPENSE')).toBe(true);
  });

  it('has Investment Income as INVESTING cash flow type across all locales', () => {
    for (const locale of SUPPORTED_LOCALES) {
      // Investment Income is the 3rd income category (index 2) in all locales
      const incomeCats = LOCALE_DEFAULT_CATEGORIES[locale].filter((c) => c.type === 'INCOME');
      expect(incomeCats[2].cashFlowType).toBe('INVESTING');
    }
  });

  it('has Interest Paid as FINANCING cash flow type across all locales', () => {
    for (const locale of SUPPORTED_LOCALES) {
      // Interest Paid is the 20th expense category (index 16 in filtered list) in all locales
      const expenseCats = LOCALE_DEFAULT_CATEGORIES[locale].filter((c) => c.type === 'EXPENSE');
      const interestPaid = expenseCats.find((c) => c.cashFlowType === 'FINANCING');
      expect(interestPaid).toBeDefined();
    }
  });

  it('has all Expense categories as OPERATING except Interest Paid across all locales', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const expenses = LOCALE_DEFAULT_CATEGORIES[locale].filter((c) => c.type === 'EXPENSE');
      const nonOperating = expenses.filter((c) => c.cashFlowType !== 'OPERATING');
      expect(nonOperating).toHaveLength(1);
    }
  });

  it('has all Income categories as OPERATING except Investment Income across all locales', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const incomes = LOCALE_DEFAULT_CATEGORIES[locale].filter((c) => c.type === 'INCOME');
      const nonOperating = incomes.filter((c) => c.cashFlowType !== 'OPERATING');
      expect(nonOperating).toHaveLength(1);
    }
  });
});
