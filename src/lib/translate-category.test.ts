import { describe, it, expect } from 'vitest';
import { translateCategoryType, translateAccountType } from './translate-category';

// The `t` function returned by useTranslations() has additional methods (rich, markup, raw, has).
// Our utility only calls it as (key: string) => string, so we cast the mock to satisfy TS.
function createMockT(overrides: Record<string, string> = {}) {
  const defaults: Record<string, string> = {
    'table.income': 'Income',
    'table.expense': 'Expense',
    'table.transfer': 'Transfer',
    'table.asset': 'Asset',
    'table.liability': 'Liability',
  };
  const all = { ...defaults, ...overrides };
  return (key: string) => all[key] ?? key;
}

describe('translateCategoryType', () => {
  const t = createMockT();

  it('returns income translation for INCOME', () => {
    expect(translateCategoryType(t, 'INCOME')).toBe('Income');
  });

  it('returns expense translation for EXPENSE', () => {
    expect(translateCategoryType(t, 'EXPENSE')).toBe('Expense');
  });

  it('returns transfer translation for TRANSFER', () => {
    expect(translateCategoryType(t, 'TRANSFER')).toBe('Transfer');
  });

  it('returns the raw type string for unknown types', () => {
    expect(translateCategoryType(t, 'SOMETHING_ELSE')).toBe('SOMETHING_ELSE');
  });
});

describe('translateAccountType', () => {
  const t = createMockT();

  it('returns asset translation for ASSET', () => {
    expect(translateAccountType(t, 'ASSET')).toBe('Asset');
  });

  it('returns liability translation for LIABILITY', () => {
    expect(translateAccountType(t, 'LIABILITY')).toBe('Liability');
  });

  it('returns the raw type string for unknown types', () => {
    expect(translateAccountType(t, 'OTHER')).toBe('OTHER');
  });
});
