'use client';

import { useTranslations } from 'next-intl';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Button } from '@/app/components/ui';

interface PaginationProps {
  totalCount: number;
  pageSize: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  totalCount,
  pageSize,
  currentPage,
  onPageChange,
}: PaginationProps) {
  const t = useTranslations('transactions');
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = totalCount === 0 ? 0 : (safePage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalCount);

  // Build visible page numbers (up to 7, with ellipsis logic)
  const getPageNumbers = (): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    if (safePage > 3) pages.push('...');
    for (let p = Math.max(2, safePage - 1); p <= Math.min(totalPages - 1, safePage + 1); p++) {
      pages.push(p);
    }
    if (safePage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  if (totalCount === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-base-200 bg-base-100">
      {/* Result range info */}
      <p className="text-xs text-base-content/50">
        {t('pagination.showing', {
          start: (startIdx + 1).toLocaleString(),
          end: endIdx.toLocaleString(),
          total: totalCount.toLocaleString(),
        })}
      </p>

      {/* Page controls */}
      <div className="join">
        {/* First page */}
        <Button
          variant="ghost"
          size="xs"
          className="join-item"
          onClick={() => onPageChange(1)}
          disabled={safePage === 1}
          title={t('pagination.firstPage')}
          aria-label={t('pagination.firstPage')}
          icon={<ChevronsLeft className="w-3.5 h-3.5" />}
        />

        {/* Prev */}
        <Button
          variant="ghost"
          size="xs"
          className="join-item"
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={safePage === 1}
          title={t('pagination.prevPage')}
          aria-label={t('pagination.prevPage')}
          icon={<ChevronLeft className="w-3.5 h-3.5" />}
        />

        {/* Numbered pages */}
        {getPageNumbers().map((p, i) => {
          const isActive = safePage === p;
          return p === '...' ? (
            <Button
              key={`ellipsis-${i}`}
              variant="ghost"
              size="xs"
              className="join-item"
              disabled
            >
              …
            </Button>
          ) : (
            <Button
              key={p}
              variant={isActive ? 'primary' : 'ghost'}
              size="xs"
              className="join-item"
              onClick={() => onPageChange(p as number)}
              aria-label={t('pagination.goToPage', { page: p })}
              aria-current={isActive ? 'page' : undefined}
            >
              {p}
            </Button>
          );
        })}

        {/* Next */}
        <Button
          variant="ghost"
          size="xs"
          className="join-item"
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          disabled={safePage === totalPages}
          title={t('pagination.nextPage')}
          aria-label={t('pagination.nextPage')}
          icon={<ChevronRight className="w-3.5 h-3.5" />}
        />

        {/* Last page */}
        <Button
          variant="ghost"
          size="xs"
          className="join-item"
          onClick={() => onPageChange(totalPages)}
          disabled={safePage === totalPages}
          title={t('pagination.lastPage')}
          aria-label={t('pagination.lastPage')}
          icon={<ChevronsRight className="w-3.5 h-3.5" />}
        />
      </div>
    </div>
  );
}
