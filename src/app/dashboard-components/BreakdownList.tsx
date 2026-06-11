import React from 'react';
import Link from 'next/link';
import { Tag } from 'lucide-react';
import { getCurrencySymbol } from '@/lib/currencies';

export interface BreakdownItem {
  name: string;
  amount: number;
  href?: string;
}

interface BreakdownListProps {
  title: string;
  titleColorClass: string;
  items: BreakdownItem[];
  totalAmount: number;
  emptyMessage: string;
  progressColorClass: string;
  currency?: string;
  locale?: string;
}

export default function BreakdownList({
  title,
  titleColorClass,
  items,
  totalAmount,
  emptyMessage,
  progressColorClass,
  currency = 'USD',
  locale,
}: BreakdownListProps) {
  const symbol = getCurrencySymbol(currency);
  return (
    <div className="card bg-base-100 shadow-lg border border-base-200" role="region" aria-label={title}>
      <div className="card-body p-6">
        <h3 className={`card-title text-base font-bold ${titleColorClass} mb-2 flex items-center gap-2`}>
          <Tag className="h-5 w-5" aria-hidden="true" />
          {title}
        </h3>
        <div className="space-y-3 mt-4 max-h-[280px] sm:max-h-[340px] overflow-y-auto pr-1">
          {items.length === 0 ? (
            <p className="text-xs text-base-content/50 py-4 text-center" role="status">{emptyMessage}</p>
          ) : (
            items.map((item) => {
              const percentage = Math.round((item.amount / Math.max(1, totalAmount)) * 100);
              return (
                <div key={item.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    {item.href ? (
                      <Link href={item.href} className="hover:text-primary transition-colors">
                        {item.name}
                      </Link>
                    ) : (
                      <span>{item.name}</span>
                    )}
                    <span>
                      {symbol}{item.amount.toLocaleString(locale, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      ({percentage}%)
                    </span>
                  </div>
                  <progress
                    className={`progress ${progressColorClass} w-full`}
                    value={percentage}
                    max="100"
                    aria-label={`${item.name}: ${percentage}%`}
                  ></progress>
                  {/* Screen reader accessible percentage */}
                  <span className="sr-only" role="status">{item.name}: {percentage}% of total</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
