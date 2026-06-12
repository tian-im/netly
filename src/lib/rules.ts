export interface RuleLike {
  pattern: string;
  categoryId: string;
}

/**
 * Matches a transaction's payee and description against a list of categorization rules.
 * Supports standard substring matching and regex patterns.
 * Returns the matched categoryId or null.
 */
export function matchRule(
  payee: string,
  description: string | null,
  rules: RuleLike[]
): string | null {
  const cleanPayee = payee.toLowerCase();
  const cleanDesc = description ? description.toLowerCase() : '';

  for (const rule of rules) {
    const pattern = rule.pattern;
    const lowerPattern = pattern.toLowerCase();

    // Check if the pattern is a regex (starts with ^, ends with $, or contains standard regex metacharacters)
    const isRegex = /[\^$*+?.()|[\]{}]/.test(pattern);

    if (isRegex) {
      try {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(payee) || (description && regex.test(description))) {
          return rule.categoryId;
        }
      } catch (e) {
        // Invalid regex — skip this rule; don't fall through to substring matching
        continue;
      }
    } else {
      // Standard substring matching (case-insensitive)
      if (cleanPayee.includes(lowerPattern) || cleanDesc.includes(lowerPattern)) {
        return rule.categoryId;
      }
    }
  }

  return null;
}
