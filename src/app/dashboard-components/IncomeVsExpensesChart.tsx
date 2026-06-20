'use client';

import React from 'react';
import { BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import type { TooltipContentProps } from 'recharts';
import { getCurrencySymbol, formatCompactNumber, DEFAULT_CURRENCY } from '@/lib/currencies';

import { Card } from '@/app/components/ui';

interface IncomeVsExpensesChartProps {
  title: string;
  subtitle: string;
  totalIncome: number;
  totalExpenses: number;
  incomeLabel: string;
  expenseLabel: string;
  chartIncomeLabel: string;
  chartExpenseLabel: string;
  currency?: string;
  locale?: string;
  tooltipLabel?: string;
}

export const CustomTooltip = ({
  active,
  payload,
  tooltipLabel,
  locale,
}: Partial<TooltipContentProps<number, string>> & {
  tooltipLabel: string;
  locale?: string;
}) => {
  if (active && payload && payload.length) {
    const entry = payload[0].payload;
    const isIncome = entry.isIncome;
    return (
      <div className="bg-base-100 border border-base-content/10 p-3 rounded-xl shadow-lg text-xs font-sans">
        <p className="font-semibold text-base-content mb-1">{entry.name}</p>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isIncome ? 'bg-success' : 'bg-error'}`} />
          <span className="text-base-content/70">{tooltipLabel}:</span>
          <span className={`font-bold ${isIncome ? 'text-success' : 'text-error'}`}>
            {formatCompactNumber(Number(entry.amount), locale)}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export default function IncomeVsExpensesChart({
  title,
  subtitle,
  totalIncome,
  totalExpenses,
  incomeLabel,
  expenseLabel,
  chartIncomeLabel,
  chartExpenseLabel,
  currency = DEFAULT_CURRENCY,
  locale,
  tooltipLabel = 'Amount',
}: IncomeVsExpensesChartProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const symbol = getCurrencySymbol(currency);

  const data = [
    { name: chartIncomeLabel, amount: totalIncome, isIncome: true },
    { name: chartExpenseLabel, amount: totalExpenses, isIncome: false },
  ];

  return (
    <Card shadow="lg">
      <Card.Body className="p-6 flex flex-col justify-between h-full">
        <div>
          <Card.Title icon={<BarChart3 className="h-5 w-5" aria-hidden="true" />} className="text-base mb-1">
            {title}
          </Card.Title>
          <p className="text-xs opacity-50 mb-4">{subtitle}</p>
        </div>

        <div className="w-full h-40" role="img" aria-label={`${title}: ${incomeLabel} ${symbol}${totalIncome}, ${expenseLabel} ${symbol}${totalExpenses}`}>
          {mounted ? (
            <BarChart
              style={{ width: '100%', height: '100%' }}
              responsive
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <XAxis
                dataKey="name"
                stroke="var(--color-base-content)"
                style={{ opacity: 0.6 }}
                fontSize={10}
                tickLine={false}
                axisLine={false}
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
              <Tooltip
                cursor={{ fill: 'transparent' }}
                content={<CustomTooltip tooltipLabel={tooltipLabel} locale={locale} />}
              />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isIncome ? 'var(--color-success)' : 'var(--color-error)'}
                  />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <div className="w-full h-full bg-base-200/50 animate-pulse rounded-lg" />
          )}
        </div>

        <div className="w-full grid grid-cols-2 gap-4 text-xs font-bold border-t border-base-200 pt-3 mt-4">
          <div className="flex flex-col">
            <span className="text-success/70 text-xs uppercase opacity-85">{incomeLabel}</span>
            <span className="text-sm font-extrabold text-success">
              +{symbol}{totalIncome.toLocaleString(locale, { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex flex-col border-l border-base-200 pl-3">
            <span className="text-error/70 text-xs uppercase opacity-85">{expenseLabel}</span>
            <span className="text-sm font-extrabold text-error">
              -{symbol}{totalExpenses.toLocaleString(locale, { maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}
