import React from 'react';

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden="true">
      {/* Title skeleton */}
      <div>
        <div className="h-8 bg-base-300 rounded-lg w-1/3"></div>
        <div className="h-4 bg-base-200 rounded-lg w-1/2 mt-2"></div>
      </div>

      {/* Selector Options Header Bar skeleton */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-base-100 p-4 rounded-2xl border border-base-200">
        <div className="flex flex-wrap items-center gap-4">
          <div className="h-8 bg-base-200 rounded-lg w-48"></div>
          <div className="h-6 bg-base-200 rounded-lg w-32"></div>
        </div>
      </div>

      {/* Overview Stat Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card bg-base-100 border border-base-200">
            <div className="card-body p-5 space-y-3">
              <div className="flex justify-between items-start">
                <div className="h-4 bg-base-200 rounded w-24"></div>
                <div className="h-5 bg-base-200 rounded-full w-5"></div>
              </div>
              <div className="h-8 bg-base-300 rounded w-28"></div>
              <div className="h-3 bg-base-200 rounded w-36"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Main visual blocks skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Net Worth Trend Chart card skeleton */}
        <div className="card bg-base-100 border border-base-200 lg:col-span-2">
          <div className="card-body p-6 space-y-4">
            <div className="h-5 bg-base-300 rounded w-48"></div>
            <div className="h-52 bg-base-200 rounded-xl w-full"></div>
          </div>
        </div>

        {/* Income vs Expenses Summary skeleton */}
        <div className="card bg-base-100 border border-base-200">
          <div className="card-body p-6 space-y-4 flex flex-col justify-between">
            <div>
              <div className="h-5 bg-base-300 rounded w-40"></div>
              <div className="h-3 bg-base-200 rounded w-32 mt-2"></div>
            </div>
            <div className="h-32 bg-base-200 rounded-xl w-full"></div>
            <div className="grid grid-cols-2 gap-4 border-t border-base-200 pt-3">
              <div className="space-y-2">
                <div className="h-3 bg-base-200 rounded w-12"></div>
                <div className="h-4 bg-base-300 rounded w-16"></div>
              </div>
              <div className="space-y-2 pl-3 border-l border-base-200">
                <div className="h-3 bg-base-200 rounded w-12"></div>
                <div className="h-4 bg-base-300 rounded w-16"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cash Flow details & Category break down grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card bg-base-100 border border-base-200">
            <div className="card-body p-6 space-y-4">
              <div className="h-5 bg-base-300 rounded w-36"></div>
              <div className="space-y-3">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="flex justify-between items-center">
                    <div className="h-3 bg-base-200 rounded w-20"></div>
                    <div className="h-4 bg-base-300 rounded w-16"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Managed Accounts table skeleton */}
      <div className="card bg-base-100 border border-base-200">
        <div className="card-body p-6 space-y-4">
          <div className="h-5 bg-base-300 rounded w-40"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-base-200/50">
                <div className="space-y-2">
                  <div className="h-4 bg-base-300 rounded w-36"></div>
                  <div className="h-3 bg-base-200 rounded w-20"></div>
                </div>
                <div className="h-4 bg-base-200 rounded w-16"></div>
                <div className="h-4 bg-base-300 rounded w-24"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
