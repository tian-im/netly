'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { getCurrencySymbol, formatCompactNumber } from '@/lib/currencies';

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

export default function IncomeVsExpensesChart({
  title,
  subtitle,
  totalIncome,
  totalExpenses,
  incomeLabel,
  expenseLabel,
  chartIncomeLabel,
  chartExpenseLabel,
  currency = 'USD',
  locale,
  tooltipLabel = 'Amount',
}: IncomeVsExpensesChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const symbol = getCurrencySymbol(currency);

  const data = [
    { name: chartIncomeLabel, amount: totalIncome, isIncome: true },
    { name: chartExpenseLabel, amount: totalExpenses, isIncome: false },
  ];

  return (
    <div className="card bg-base-100 shadow-lg border border-base-200">
      <div className="card-body p-6 flex flex-col justify-between h-full">
        <div>
          <h3 className="card-title text-base font-bold text-primary mb-1 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" aria-hidden="true" />
            {title}
          </h3>
          <p className="text-xs opacity-50 mb-4">{subtitle}</p>
        </div>

        <div className="w-full h-40" role="img" aria-label={`${title}: ${incomeLabel} ${symbol}${totalIncome}, ${expenseLabel} ${symbol}${totalExpenses}`}>
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  stroke="var(--bc)"
                  strokeOpacity={0.6}
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--bc)"
                  strokeOpacity={0.6}
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => formatCompactNumber(val, locale)}
                  width={40}
                />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{
                    backgroundColor: 'var(--b1)',
                    borderColor: 'color-mix(in srgb, var(--bc) 10%, transparent)',
                    borderRadius: '12px',
                    color: 'var(--bc)',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [
                      formatCompactNumber(Number(value), locale),
                      tooltipLabel,
                    ]}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isIncome ? 'var(--su)' : 'var(--er)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full bg-base-200/50 animate-pulse rounded-lg" />
          )}
        </div>

        <div className="w-full grid grid-cols-2 gap-4 text-xs font-bold border-t border-base-200 pt-3 mt-4">
          <div className="flex flex-col">
            <span className="text-success/70 text-[10px] uppercase opacity-85">{incomeLabel}</span>
            <span className="text-sm font-extrabold text-success">
              +{symbol}{totalIncome.toLocaleString(locale, { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex flex-col border-l border-base-200 pl-3">
            <span className="text-error/70 text-[10px] uppercase opacity-85">{expenseLabel}</span>
            <span className="text-sm font-extrabold text-error">
              -{symbol}{totalExpenses.toLocaleString(locale, { maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
