'use client';

import React from 'react';
import { TrendingUp } from 'lucide-react';
import { formatCompactNumber } from '@/lib/currencies';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { TooltipContentProps } from 'recharts';

import { Card } from '@/app/components/ui';

interface TrendDataItem {
  label: string;
  value: number;
}

interface NetWorthTrendChartProps {
  title: string;
  data: TrendDataItem[];
  noDataText: string;
  isEmpty: boolean;
  locale?: string;
  tooltipLabel?: string;
  rangeSelector?: React.ReactNode;
}

export const CustomTooltip = ({
  active,
  payload,
  label,
  tooltipLabel,
  locale,
}: Partial<TooltipContentProps<number, string>> & {
  tooltipLabel: string;
  locale?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-base-100 border border-base-content/10 p-3 rounded-xl shadow-lg text-xs font-sans">
        <p className="font-semibold text-base-content mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary" />
          <span className="text-base-content/70">{tooltipLabel}:</span>
          <span className="font-bold text-base-content">
            {formatCompactNumber(Number(payload[0].value), locale)}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export default function NetWorthTrendChart({
  title,
  data,
  noDataText,
  isEmpty,
  locale,
  tooltipLabel = 'Net Worth',
  rangeSelector,
}: NetWorthTrendChartProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Card shadow="lg" className="lg:col-span-2" data-testid="net-worth-trend-card">
      <Card.Body className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Card.Title icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />} className="text-base">
            {title}
          </Card.Title>
          {rangeSelector}
        </div>

        {isEmpty ? (
          <div className="flex items-center justify-center h-56 text-base-content/50">
            {noDataText}
          </div>
        ) : (
          <>
          <div className="w-full h-56 mt-4" role="img" aria-label={`${title}. Chart data available in table below.`}>
            {mounted ? (
              /* WHY: We use a LineChart instead of an AreaChart per explicit user request
                 to simplify the layout and focus strictly on the net worth line trend. */
              <LineChart
                style={{ width: '100%', height: '100%' }}
                responsive
                data={data}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-base-content)" style={{ opacity: 0.1 }} />
                <XAxis
                  dataKey="label"
                  stroke="var(--color-base-content)"
                  style={{ opacity: 0.6 }}
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  stroke="var(--color-base-content)"
                  style={{ opacity: 0.6 }}
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => formatCompactNumber(val, locale)}
                  width={40}
                />
                <Tooltip content={<CustomTooltip tooltipLabel={tooltipLabel} locale={locale} />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  dot={{
                    fill: 'var(--color-base-100)',
                    stroke: 'var(--color-primary)',
                    strokeWidth: 2,
                    r: 4,
                  }}
                  activeDot={{ r: 6, fill: 'var(--color-primary)', stroke: 'var(--color-base-100)', strokeWidth: 2 }}
                />
              </LineChart>
            ) : (
              <div className="w-full h-full bg-base-200/50 animate-pulse rounded-lg" />
            )}
          </div>
          {/* Accessible data table for screen readers (visually hidden) */}
          {data.length > 0 && (
            <table className="sr-only" aria-label={`${title} data table`}>
              <thead>
                <tr>
                  <th scope="col">Period</th>
                  <th scope="col">{tooltipLabel}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i}>
                    <td>{row.label}</td>
                    <td>{formatCompactNumber(row.value, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          </>
        )}
      </Card.Body>
    </Card>
  );
}
