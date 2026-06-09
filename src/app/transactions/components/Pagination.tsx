'use client';

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

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
        Showing{' '}
        <span className="font-semibold text-base-content">
          {(startIdx + 1).toLocaleString()}–{endIdx.toLocaleString()}
        </span>{' '}
        of{' '}
        <span className="font-semibold text-base-content">
          {totalCount.toLocaleString()}
        </span>{' '}
        transaction{totalCount !== 1 ? 's' : ''}
      </p>

      {/* Page controls */}
      <div className="join">
        {/* First page */}
        <button
          className="join-item btn btn-xs btn-ghost"
          onClick={() => onPageChange(1)}
          disabled={safePage === 1}
          title="First page"
          aria-label="First page"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Prev */}
        <button
          className="join-item btn btn-xs btn-ghost"
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={safePage === 1}
          title="Previous page"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Numbered pages */}
        {getPageNumbers().map((p, i) =>
          p === '...' ? (
            <button
              key={`ellipsis-${i}`}
              className="join-item btn btn-xs btn-disabled"
              disabled
            >
              …
            </button>
          ) : (
            <button
              key={p}
              className={`join-item btn btn-xs ${
                safePage === p ? 'btn-primary' : 'btn-ghost'
              }`}
              onClick={() => onPageChange(p as number)}
              aria-label={`Go to page ${p}`}
              aria-current={safePage === p ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          className="join-item btn btn-xs btn-ghost"
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          disabled={safePage === totalPages}
          title="Next page"
          aria-label="Next page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Last page */}
        <button
          className="join-item btn btn-xs btn-ghost"
          onClick={() => onPageChange(totalPages)}
          disabled={safePage === totalPages}
          title="Last page"
          aria-label="Last page"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
