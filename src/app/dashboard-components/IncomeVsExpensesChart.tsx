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

interface IncomeVsExpensesChartProps {
  title: string;
  subtitle: string;
  totalIncome: number;
  totalExpenses: number;
  incomeLabel: string;
  expenseLabel: string;
  chartIncomeLabel: string;
  chartExpenseLabel: string;
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
}: IncomeVsExpensesChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

        <div className="w-full h-32" role="img" aria-label={`${title}: ${incomeLabel} $${totalIncome}, ${expenseLabel} $${totalExpenses}`}>
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  stroke="hsl(var(--bc) / 0.6)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--bc) / 0.6)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `$${val.toLocaleString()}`}
                />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--b1))',
                    borderColor: 'hsl(var(--bc) / 0.1)',
                    borderRadius: '12px',
                    color: 'hsl(var(--bc))',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [
                    `$${Number(value).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`,
                    'Amount',
                  ]}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isIncome ? 'hsl(var(--su))' : 'hsl(var(--er))'}
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
              +${totalIncome.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex flex-col border-l border-base-200 pl-3">
            <span className="text-error/70 text-[10px] uppercase opacity-85">{expenseLabel}</span>
            <span className="text-sm font-extrabold text-error">
              -${totalExpenses.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
