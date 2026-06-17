interface RenderDeltaProps {
  current: number;
  prior: number;
  showDelta: boolean;
  reverseImpact?: boolean; // If true, a decrease is positive (e.g. liabilities, expenses, outflows)
  locale?: string; // Locale for number formatting (default: undefined uses browser locale)
}

export function RenderDelta({ current, prior, showDelta, reverseImpact = false, locale }: RenderDeltaProps) {
  if (!showDelta) return null;
  const delta = current - prior;
  if (Math.abs(delta) < 0.005) return null;

  // WHY: When prior is 0, a percentage change is mathematically undefined (division by zero).
  // Showing +100% would be misleading (e.g. a new account with $5,000 would show "+$5,000 (+100%)"
  // when 100% of nothing has no meaning). Instead we omit the percentage entirely.
  const priorIsZero = prior === 0;
  const pctChange = priorIsZero ? 0 : (delta / Math.abs(prior)) * 100;
  const isPositiveImpact = reverseImpact ? delta < 0 : delta > 0;

  return (
    <span className={`text-xs font-semibold font-mono ${isPositiveImpact ? 'text-success' : 'text-error'}`}>
      {delta > 0 ? '+' : ''}
      {delta.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      {!priorIsZero && (
        <>{' '}({delta > 0 ? '+' : ''}{pctChange.toFixed(0)}%)</>
      )}
    </span>
  );
}
