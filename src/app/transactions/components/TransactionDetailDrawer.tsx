'use client';

import { useTranslations, useFormatter } from 'next-intl';
import { X, Calendar, Landmark, Tag, DollarSign, Info } from 'lucide-react';
import { Transaction, Category } from '../types';
import { useLocaleContext } from '@/app/providers';
import { translateCategoryType, translateAccountType } from '@/lib/translate-category';
import { DEFAULT_CURRENCY } from '@/lib/currencies';
import { Button } from '@/app/components/ui';

interface TransactionDetailDrawerProps {
  transaction: Transaction | null;
  categories: Category[];
  isPending: boolean;
  onClose: () => void;
  onCategoryChange: (transaction: Transaction, categoryId: string) => void;
}

export default function TransactionDetailDrawer({
  transaction,
  categories,
  isPending,
  onClose,
  onCategoryChange,
}: TransactionDetailDrawerProps) {
  const t = useTranslations('transactions');
  const format = useFormatter();
  const { locale } = useLocaleContext();

  if (!transaction) return null;

  const formattedAmount = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: transaction.account.currency || DEFAULT_CURRENCY,
  }).format(Math.abs(transaction.amount));

  const formattedDate = format.dateTime(new Date(transaction.date), {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
      <div className="absolute inset-0 overflow-hidden">
        {/* Backdrop overlay */}
        <div
          className="absolute inset-0 bg-base-300/40 backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />

        <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
          <div className="pointer-events-auto w-screen max-w-md transform bg-base-100 p-6 shadow-2xl border-l border-base-200 transition-all duration-300 ease-in-out">
            <div className="flex flex-col h-full justify-between">
              {/* Header */}
              <div>
                <div className="flex items-start justify-between">
                  <h2 id="slide-over-title" className="text-xl font-bold text-base-content break-words pr-4">
                    {t('detail.title')}
                  </h2>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="btn-circle text-base-content/50 hover:text-base-content"
                    onClick={onClose}
                    icon={<X className="w-5 h-5" />}
                  />
                </div>

                <div className="mt-6 border-b border-base-200 pb-6 text-center">
                  <div
                    className={`inline-block font-mono text-3xl font-extrabold ${
                      transaction.amount >= 0 ? 'text-success' : 'text-error'
                    }`}
                  >
                    {transaction.amount >= 0 ? '+' : '-'}{formattedAmount}
                  </div>
                  <div className="text-xs text-base-content/50 mt-1 uppercase tracking-wider font-semibold">
                    {transaction.account.currency}
                  </div>
                </div>

                {/* Info List */}
                <div className="mt-6 space-y-5">
                  {/* Payee */}
                  <div>
                    <label className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">{t('detail.payee')}</label>
                    <div className="text-base font-bold text-base-content mt-1 break-words">{transaction.payee}</div>
                  </div>

                  {/* Memo / Description */}
                  {transaction.description && (
                    <div>
                      <label className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">{t('detail.description')}</label>
                      <div className="text-sm text-base-content/75 mt-1 bg-base-200/50 p-3 rounded-lg border border-base-200/60 break-words font-mono">
                        {transaction.description}
                      </div>
                    </div>
                  )}

                  {/* Date */}
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4.5 h-4.5 text-base-content/40 shrink-0" />
                    <div>
                      <span className="block text-xs font-semibold text-base-content/40 uppercase tracking-wider">{t('detail.date')}</span>
                      <span className="text-sm font-medium text-base-content">{formattedDate}</span>
                    </div>
                  </div>

                  {/* Account */}
                  <div className="flex items-center gap-3">
                    <Landmark className="w-4.5 h-4.5 text-base-content/40 shrink-0" />
                    <div>
                      <span className="block text-xs font-semibold text-base-content/40 uppercase tracking-wider">{t('detail.account')}</span>
                      <span className="text-sm font-medium text-base-content">
                        {transaction.account.name}{' '}
                        <span className="text-xs opacity-60">({translateAccountType(t, transaction.account.type)})</span>
                      </span>
                    </div>
                  </div>

                  {/* Category Assignment */}
                  <div className="flex items-start gap-3">
                    <Tag className="w-4.5 h-4.5 text-base-content/40 mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <span className="block text-xs font-semibold text-base-content/40 uppercase tracking-wider mb-1">{t('detail.category')}</span>
                      <select
                        value={transaction.categoryId || ''}
                        onChange={(e) => onCategoryChange(transaction, e.target.value)}
                        className={`select select-bordered select-sm w-full font-semibold ${
                          !transaction.categoryId ? 'select-warning text-warning-content' : ''
                        }`}
                        disabled={isPending}
                      >
                        <option value="">{t('table.uncategorized')}</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({translateCategoryType(t, c.type)})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Reviewed state badge */}
                  <div className="flex items-center gap-2 mt-4">
                    <span
                      className={`badge badge-sm font-semibold ${
                        transaction.isReviewed ? 'badge-success text-success-content' : 'badge-warning text-warning-content'
                      }`}
                    >
                      {transaction.isReviewed ? t('detail.reviewed') : t('detail.needsReview')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer info banner */}
              <div className="mt-8 bg-primary/5 border border-primary/10 rounded-xl p-4 flex gap-3 text-xs text-primary-content/80">
                <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-primary">{t('detail.needAutoCategorizeTitle')}</h4>
                  <p className="mt-0.5 opacity-90 leading-relaxed">
                    {t('detail.needAutoCategorizeDesc')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
