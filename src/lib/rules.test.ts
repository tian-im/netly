import { describe, it, expect } from 'vitest';
import { matchRule } from './rules';

interface RuleMock {
  id: string;
  pattern: string;
  categoryId: string;
}

describe('Auto-Categorization Rules Engine', () => {
  const rules: RuleMock[] = [
    { id: '1', pattern: 'Uber', categoryId: 'cat_transport' },
    { id: '2', pattern: 'Woolworths', categoryId: 'cat_groceries' },
    { id: '3', pattern: 'Coles', categoryId: 'cat_groceries' },
    { id: '4', pattern: 'Salary', categoryId: 'cat_salary' },
    { id: '5', pattern: '^Netflix.*Subscription$', categoryId: 'cat_utilities' }, // regex rule
  ];

  it('should match direct substring case-insensitively', () => {
    expect(matchRule('UBER TRIP HELP', null, rules)).toBe('cat_transport');
    expect(matchRule('Woolworths Supermarkets', null, rules)).toBe('cat_groceries');
    expect(matchRule('COLES SYDNEY', 'Weekly groceries', rules)).toBe('cat_groceries');
  });

  it('should match descriptions if payee does not match', () => {
    expect(matchRule('POS TRANSACTION', 'Uber Trip', rules)).toBe('cat_transport');
  });

  it('should handle regex patterns correctly', () => {
    expect(matchRule('Netflix Monthly Subscription', null, rules)).toBe('cat_utilities');
    expect(matchRule('Netflix Monthly Subscription Extra', null, rules)).toBeNull();
  });

  it('should return null if no rules match', () => {
    expect(matchRule('Unknown Merchant LLC', 'Some purchase description', rules)).toBeNull();
  });

  it('should handle empty rules list gracefully', () => {
    expect(matchRule('Uber Trip', null, [])).toBeNull();
  });

  it('should catch invalid regex syntax and fall back to substring match', () => {
    const invalidRegexRules: RuleMock[] = [
      { id: '6', pattern: '[a-z', categoryId: 'cat_invalid' }, // missing closing bracket
    ];
    // should not crash, should fall back to substring check
    expect(matchRule('some [a-z text', null, invalidRegexRules)).toBe('cat_invalid');
  });
});
