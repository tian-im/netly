import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { getCurrencySymbol } from '@/lib/currencies';

interface StatCardProps {
  title: string;
  icon: React.ReactNode;
  value: React.ReactNode;
  currency?: string;
  valueClass?: string;
  trend?: {
    delta: number;
    pct: number;
    isPositive: boolean;
    vsLabel: string;
  };
  progress?: {
    percentage: number;
    colorClass: string;
  };
  subtitle?: React.ReactNode;
}

export default function StatCard({
  title,
  icon,
  value,
  currency = 'USD',
  valueClass = '',
  trend,
  progress,
  subtitle,
}: StatCardProps) {
  return (
    <div className="card bg-base-100 shadow-md border border-base-200">
      <div className="card-body p-5">
        <div className="flex justify-between items-start">
          <span className="text-sm font-bold opacity-60 uppercase tracking-wider">{title}</span>
          <div className="text-primary" aria-hidden="true">
            {icon}
          </div>
        </div>
        <div className="mt-2">
          <div className={`text-2xl font-extrabold ${valueClass}`}>
            {value}
          </div>

          {trend && (
            <div className="mt-1 flex items-center gap-1 text-xs">
              {trend.isPositive ? (
                <>
                  <ArrowUpRight className="h-3.5 w-3.5 text-success" />
                  <span className="sr-only">Up</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-3.5 w-3.5 text-error" />
                  <span className="sr-only">Down</span>
                </>
              )}
              <span className={trend.isPositive ? 'text-success font-semibold' : 'text-error font-semibold'}>
                {trend.isPositive ? '+' : '-'}{getCurrencySymbol(currency)}{Math.abs(trend.delta).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                ({trend.pct.toFixed(1)}%)
              </span>
              <span className="opacity-50">{trend.vsLabel}</span>
            </div>
          )}

          {progress && (
            <div className="w-full bg-base-200 h-1.5 rounded-full mt-2 overflow-hidden" aria-hidden="true">
              <div
                className={`h-full ${progress.colorClass}`}
                style={{ width: `${Math.max(0, Math.min(100, progress.percentage))}%` }}
              ></div>
            </div>
          )}

          {subtitle && (
            <span className="text-xs opacity-50 mt-1 block">
              {subtitle}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
