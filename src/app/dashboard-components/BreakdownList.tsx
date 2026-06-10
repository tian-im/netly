import React from 'react';
import { Tag } from 'lucide-react';

interface BreakdownItem {
  name: string;
  amount: number;
}

interface BreakdownListProps {
  title: string;
  titleColorClass: string;
  items: BreakdownItem[];
  totalAmount: number;
  emptyMessage: string;
  progressColorClass: string;
}

export default function BreakdownList({
  title,
  titleColorClass,
  items,
  totalAmount,
  emptyMessage,
  progressColorClass,
}: BreakdownListProps) {
  return (
    <div className="card bg-base-100 shadow-lg border border-base-200">
      <div className="card-body p-6">
        <h3 className={`card-title text-base font-bold ${titleColorClass} mb-2 flex items-center gap-2`}>
          <Tag className="h-5 w-5" aria-hidden="true" />
          {title}
        </h3>
        <div className="space-y-3 mt-4 max-h-[190px] overflow-y-auto pr-1">
          {items.length === 0 ? (
            <p className="text-xs text-base-content/50 py-4 text-center">{emptyMessage}</p>
          ) : (
            items.map((item) => {
              const percentage = Math.round((item.amount / Math.max(1, totalAmount)) * 100);
              return (
                <div key={item.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>{item.name}</span>
                    <span>
                      ${item.amount.toLocaleString(undefined, {
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
                  ></progress>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
