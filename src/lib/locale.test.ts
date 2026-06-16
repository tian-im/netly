import { describe, it, expect } from 'vitest';
import { parseAcceptLanguage, resolveLocale, DEFAULT_CATEGORIES, getDefaultCategories } from './locale';

describe('parseAcceptLanguage', () => {
  it('returns "en" for null input', () => {
    expect(parseAcceptLanguage(null)).toBe('en');
  });

  it('returns "en" for undefined/empty input', () => {
    expect(parseAcceptLanguage('')).toBe('en');
  });

  it('parses Chinese-first Accept-Language header', () => {
    expect(parseAcceptLanguage('zh-CN,zh;q=0.9,en;q=0.8')).toBe('zh');
  });

  it('parses English-first Accept-Language header', () => {
    expect(parseAcceptLanguage('en-US,en;q=0.9')).toBe('en');
  });

  it('falls back to "en" for unsupported languages', () => {
    expect(parseAcceptLanguage('ja-JP')).toBe('en');
  });

  it('prefers zh over en when both have equal quality', () => {
    expect(parseAcceptLanguage('en-US,en;q=1,zh-CN,zh;q=1')).toBe('zh');
  });

  it('handles malformed quality values gracefully', () => {
    expect(parseAcceptLanguage('en;q=invalid,zh;q=0.9')).toBe('zh');
  });

  it('handles single language tag without quality', () => {
    expect(parseAcceptLanguage('zh')).toBe('zh');
    expect(parseAcceptLanguage('en')).toBe('en');
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

  it('returns en for Request with unsupported language', () => {
    const req = new Request('http://localhost', {
      headers: { 'Accept-Language': 'ja-JP' },
    });
    expect(resolveLocale(req)).toBe('en');
  });
});

describe('getDefaultCategories', () => {
  it('returns English categories for en locale', () => {
    const cats = getDefaultCategories('en');
    expect(cats).toHaveLength(23);
    expect(cats[0].name).toBe('Salary');
  });

  it('returns Chinese categories for zh locale', () => {
    const cats = getDefaultCategories('zh');
    expect(cats).toHaveLength(23);
    expect(cats[0].name).toBe('工资收入');
  });

  it('falls back to English for unknown locale', () => {
    const cats = getDefaultCategories('fr' as 'en' | 'zh');
    expect(cats).toHaveLength(23);
    expect(cats[0].name).toBe('Salary');
  });
});

describe('DEFAULT_CATEGORIES', () => {
  it('has English locale with 23 categories', () => {
    expect(DEFAULT_CATEGORIES.en).toHaveLength(23);
  });

  it('has Chinese locale with 23 categories', () => {
    expect(DEFAULT_CATEGORIES.zh).toHaveLength(23);
  });

  it('has matching category types between locales', () => {
    for (let i = 0; i < DEFAULT_CATEGORIES.en.length; i++) {
      expect(DEFAULT_CATEGORIES.en[i].type).toBe(DEFAULT_CATEGORIES.zh[i].type);
      expect(DEFAULT_CATEGORIES.en[i].cashFlowType).toBe(DEFAULT_CATEGORIES.zh[i].cashFlowType);
    }
  });

  it('contains exactly one TRANSFER category (protected)', () => {
    const enTransfer = DEFAULT_CATEGORIES.en.filter((c) => c.type === 'TRANSFER');
    const zhTransfer = DEFAULT_CATEGORIES.zh.filter((c) => c.type === 'TRANSFER');
    expect(enTransfer).toHaveLength(1);
    expect(zhTransfer).toHaveLength(1);
    expect(enTransfer[0].name).toBe('Transfer');
    expect(zhTransfer[0].name).toBe('转账');
  });

  it('has Income categories with correct types', () => {
    const incomeTypes = new Set(DEFAULT_CATEGORIES.en.filter((c) => c.type === 'INCOME').map((c) => c.type));
    expect(incomeTypes.size).toBe(1);
    expect(incomeTypes.has('INCOME')).toBe(true);
  });

  it('has Expense categories with correct types', () => {
    const expenseTypes = new Set(DEFAULT_CATEGORIES.en.filter((c) => c.type === 'EXPENSE').map((c) => c.type));
    expect(expenseTypes.size).toBe(1);
    expect(expenseTypes.has('EXPENSE')).toBe(true);
  });

  it('has Investment Income as INVESTING cash flow type', () => {
    const investIncome = DEFAULT_CATEGORIES.en.find((c) => c.name === 'Investment Income');
    expect(investIncome?.cashFlowType).toBe('INVESTING');
    const zhInvestIncome = DEFAULT_CATEGORIES.zh.find((c) => c.name === '投资收益');
    expect(zhInvestIncome?.cashFlowType).toBe('INVESTING');
  });

  it('has Interest Paid as FINANCING cash flow type', () => {
    const interestPaid = DEFAULT_CATEGORIES.en.find((c) => c.name === 'Interest Paid');
    expect(interestPaid?.cashFlowType).toBe('FINANCING');
    const zhInterestPaid = DEFAULT_CATEGORIES.zh.find((c) => c.name === '利息支出');
    expect(zhInterestPaid?.cashFlowType).toBe('FINANCING');
  });

  it('has all Expense categories as OPERATING except Interest Paid', () => {
    const expenses = DEFAULT_CATEGORIES.en.filter((c) => c.type === 'EXPENSE');
    const nonOperating = expenses.filter((c) => c.cashFlowType !== 'OPERATING');
    expect(nonOperating).toHaveLength(1);
    expect(nonOperating[0].name).toBe('Interest Paid');
  });

  it('has all Income categories as OPERATING except Investment Income', () => {
    const incomes = DEFAULT_CATEGORIES.en.filter((c) => c.type === 'INCOME');
    const nonOperating = incomes.filter((c) => c.cashFlowType !== 'OPERATING');
    expect(nonOperating).toHaveLength(1);
    expect(nonOperating[0].name).toBe('Investment Income');
  });
});
