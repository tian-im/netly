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

  it('should skip rules with invalid regex syntax and fall back to substring match', () => {
    const invalidRegexRules: RuleMock[] = [
      { id: '6', pattern: '[a-z', categoryId: 'cat_invalid' }, // missing closing bracket
    ];
    // should not crash
    expect(matchRule('some [a-z text', null, invalidRegexRules)).toBe('cat_invalid');
  });

  it('should match patterns containing parentheses as valid regex', () => {
    // `(direct deposit)` triggers regex detection (has `(` and `)`), but it
    // compiles successfully as a capturing group. This tests the regex path,
    // not the regex-fallback path (that's covered by the `+uber` test above).
    const mixedRules: RuleMock[] = [
      { id: '7', pattern: '(direct deposit)', categoryId: 'cat_salary' },
    ];
    expect(matchRule('Received (direct deposit) from employer', null, mixedRules)).toBe('cat_salary');
  });

  it('should fall back to substring match when regex with special chars throws', () => {
    // Pattern that compiles as regex without throw but matches differently than substring
    // is a different concern. Here we test patterns that truly fail to compile.
    // `+uber` has `+` which triggers regex detection, but `new RegExp('+uber')` throws "Nothing to repeat"
    const badRules: RuleMock[] = [
      { id: '8', pattern: '+uber', categoryId: 'cat_transport' },
    ];
    // +uber should fail as regex, fall back to substring matching against the literal "+uber"
    expect(matchRule('+uber Trip', null, badRules)).toBe('cat_transport');
  });

  it('should continue to next rule when regex fails and substring does not match', () => {
    const rulesWithFallback: RuleMock[] = [
      { id: '11', pattern: '+xyz', categoryId: 'cat_no_match' }, // + makes it regex, throws, and +xyz not in "uber"
      { id: '12', pattern: 'Uber', categoryId: 'cat_transport' },   // next rule should match
    ];
    expect(matchRule('Uber Trip', null, rulesWithFallback)).toBe('cat_transport');
  });

  it('should first-wins when multiple rules match the same payee', () => {
    const overlappingRules: RuleMock[] = [
      { id: '9', pattern: 'Coles', categoryId: 'cat_groceries' },
      { id: '10', pattern: 'coles express', categoryId: 'cat_fuel' },
    ];
    // "Coles Express" matches both, but first rule wins
    expect(matchRule('Coles Express', null, overlappingRules)).toBe('cat_groceries');
  });
});
