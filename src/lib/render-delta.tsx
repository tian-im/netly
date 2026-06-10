interface RenderDeltaProps {
  current: number;
  prior: number;
  showDelta: boolean;
  reverseImpact?: boolean; // If true, a decrease is positive (e.g. liabilities, expenses, outflows)
}

export function RenderDelta({ current, prior, showDelta, reverseImpact = false }: RenderDeltaProps) {
  if (!showDelta) return null;
  const delta = current - prior;
  if (Math.abs(delta) < 0.005) return null;

  const pctChange = prior !== 0 ? (delta / Math.abs(prior)) * 100 : 100;
  const isPositiveImpact = reverseImpact ? delta < 0 : delta > 0;

  return (
    <span className={`text-xs font-semibold font-mono ${isPositiveImpact ? 'text-success' : 'text-error'}`}>
      {delta > 0 ? '+' : ''}
      {delta.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      {' '}({delta > 0 ? '+' : ''}{pctChange.toFixed(0)}%)
    </span>
  );
}
