import React from 'react';
import { ArrowDownRight, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { getCurrencySymbol, DEFAULT_CURRENCY } from '@/lib/currencies';

import { Card } from '@/app/components/ui';

interface CashFlowMetricsProps {
  title: string;
  ocf: number;
  fcf: number;
  investingNet: number;
  financingNet: number;
  ocfLabel: string;
  fcfLabel: string;
  investingLabel: string;
  financingLabel: string;
  detailedStatementsLabel: string;
  detailedStatementsHref?: string;
  currency?: string;
  locale?: string;
}

export default function CashFlowMetrics({
  title,
  ocf,
  fcf,
  investingNet,
  financingNet,
  ocfLabel,
  fcfLabel,
  investingLabel,
  financingLabel,
  detailedStatementsLabel,
  detailedStatementsHref = '/reports',
  currency = DEFAULT_CURRENCY,
  locale,
}: CashFlowMetricsProps) {
  const symbol = getCurrencySymbol(currency);
  const formatValue = (val: number) => {
    const isPositive = val >= 0;
    return `${isPositive ? '+' : '-'}${symbol}${Math.abs(val).toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <Card shadow="lg">
      <Card.Body className="p-6 flex flex-col justify-between h-full">
        <div>
          <Card.Title icon={<ArrowDownRight className="h-5 w-5" aria-hidden="true" />} className="text-base mb-4">
            {title}
          </Card.Title>

          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-base-200 pb-2">
              <span className="text-xs font-semibold opacity-70">{ocfLabel}</span>
              <span className={`font-bold font-mono text-sm ${ocf >= 0 ? 'text-success' : 'text-error'}`}>
                {formatValue(ocf)}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-base-200 pb-2">
              <span className="text-xs font-semibold opacity-70">{fcfLabel}</span>
              <span className={`font-bold font-mono text-sm ${fcf >= 0 ? 'text-success' : 'text-error'}`}>
                {formatValue(fcf)}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-base-200 pb-2">
              <span className="text-xs font-semibold opacity-70">{investingLabel}</span>
              <span className={`font-bold font-mono text-sm ${investingNet >= 0 ? 'text-success' : 'text-error'}`}>
                {formatValue(investingNet)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold opacity-70">{financingLabel}</span>
              <span className={`font-bold font-mono text-sm ${financingNet >= 0 ? 'text-success' : 'text-error'}`}>
                {formatValue(financingNet)}
              </span>
            </div>
          </div>
        </div>

        <Card.Actions justify="end" className="mt-6 pt-3 border-t border-base-200">
          <Link
            href={detailedStatementsHref}
            className="text-xs text-primary hover:underline font-bold flex items-center gap-1"
          >
            {detailedStatementsLabel} <ArrowRight className="h-3 w-3" />
          </Link>
        </Card.Actions>
      </Card.Body>
    </Card>
  );
}
