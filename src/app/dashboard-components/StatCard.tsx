import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { getCurrencySymbol } from '@/lib/currencies';

interface StatCardProps {
  title: string;
  icon: React.ReactNode;
  value: React.ReactNode;
  currency?: string;
  valueClass?: string;
  locale?: string;
  /** Optional href to make the entire card clickable (e.g. navigate to reports) */
  href?: string;
  trend?: {
    delta: number;
    pct: number;
    isPositive: boolean;
    vsLabel: string;
    upLabel?: string;
    downLabel?: string;
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
  currency = 'AUD',
  valueClass = '',
  locale,
  href,
  trend,
  progress,
  subtitle,
}: StatCardProps) {
  const cardContent = (
    <div className="card-body p-5">
      <div className="flex justify-between items-start">
        <span className="text-xs font-bold opacity-60 uppercase tracking-wider">{title}</span>
        <div className="text-primary" aria-hidden="true">
          {icon}
        </div>
      </div>
      <div className="mt-2">
        <div className={`text-xl sm:text-2xl font-bold ${valueClass}`}>
          {value}
        </div>

        {trend && (
          <div className="mt-1 flex items-center gap-1 text-xs" aria-label={`${trend.isPositive ? trend.upLabel || 'Up' : trend.downLabel || 'Down'} by ${Math.abs(trend.delta).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`}>
            {trend.isPositive ? (
              <>
                <ArrowUpRight className="h-3.5 w-3.5 text-success" />
                <span className="sr-only">{trend.upLabel || 'Up'}</span>
              </>
            ) : (
              <>
                <ArrowDownRight className="h-3.5 w-3.5 text-error" />
                <span className="sr-only">{trend.downLabel || 'Down'}</span>
              </>
            )}
            <span className={trend.isPositive ? 'text-success font-semibold' : 'text-error font-semibold'}>
              {trend.isPositive ? '+' : '-'}{getCurrencySymbol(currency)}{Math.abs(trend.delta).toLocaleString(locale, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              ({trend.pct.toFixed(1)}%)
            </span>
            <span className="opacity-50">{trend.vsLabel}</span>
          </div>
        )}

        {progress && (
          <div
            className="w-full h-2 rounded-full mt-2 overflow-hidden"
            style={{ backgroundColor: 'oklch(0.2 0 0 / 0.2)' }}
            role="progressbar"
            aria-valuenow={Math.max(0, Math.min(100, progress.percentage))}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${title}: ${Math.round(progress.percentage)}%`}
          >
            <div
              className={`h-full ${progress.colorClass} rounded-full`}
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
  );

  return href ? (
    <Link href={href} className="card bg-base-100 shadow-lg border border-base-200 hover:border-primary/30 hover:shadow-xl transition-all duration-200" aria-label={`${title}: ${value}`}>
      {cardContent}
    </Link>
  ) : (
    <div className="card bg-base-100 shadow-lg border border-base-200" role="region" aria-label={title}>
      {cardContent}
    </div>
  );
}
