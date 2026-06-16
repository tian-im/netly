'use client';

import React, { useState, useEffect, useId } from 'react';
import { TrendingUp } from 'lucide-react';
import { formatCompactNumber } from '@/lib/currencies';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

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
}

export default function NetWorthTrendChart({
  title,
  data,
  noDataText,
  isEmpty,
  locale,
  tooltipLabel = 'Net Worth',
}: NetWorthTrendChartProps) {
  const [mounted, setMounted] = useState(false);
  // WHY: useId() generates a unique gradient ID per component instance so that
  // multiple charts on the same page don't conflict (Fix #2).
  const gradientId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="card bg-base-100 shadow-lg border border-base-200 lg:col-span-2">
      <div className="card-body p-6">
        <h3 className="card-title text-base font-bold text-primary flex justify-between items-center">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" aria-hidden="true" />
            {title}
          </span>
        </h3>

        {isEmpty ? (
          <div className="flex items-center justify-center h-56 text-base-content/50">
            {noDataText}
          </div>
        ) : (
          <>
          <div className="w-full h-56 mt-4" role="img" aria-label={`${title}. Chart data available in table below.`}>
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--p)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--p)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--bc)" strokeOpacity={0.1} />
                  <XAxis
                    dataKey="label"
                    stroke="var(--bc)"
                    strokeOpacity={0.6}
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
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
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--p)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill={`url(#${gradientId})`}
                  />
                </AreaChart>
              </ResponsiveContainer>
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
      </div>
    </div>
  );
}
