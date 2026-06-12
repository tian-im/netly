export default function TransactionsLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden="true">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="h-8 w-56 bg-base-300 rounded-lg"></div>
          <div className="h-4 w-80 bg-base-300 rounded-lg mt-2"></div>
        </div>
        <div className="h-9 w-36 bg-base-300 rounded-lg"></div>
      </div>

      {/* Filter Bar skeleton */}
      <div className="card bg-base-100 shadow border border-base-200">
        <div className="card-body p-4 space-y-4">
          {/* Row 1: Search */}
          <div className="h-8 w-full bg-base-200 rounded-lg"></div>
          {/* Row 2: Selects */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-8 bg-base-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>

      {/* Table skeleton */}
      <div className="card bg-base-100 shadow-xl border border-base-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table table-zebra table-md min-w-[800px]">
            <thead>
              <tr className="border-b border-base-200 bg-base-200/50">
                {[...Array(6)].map((_, i) => (
                  <th key={i} className="py-3 px-4">
                    <div className="h-3 w-16 bg-base-300 rounded"></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(8)].map((_, row) => (
                <tr key={row} className="border-b border-base-200">
                  {[...Array(6)].map((_, col) => (
                    <td key={col} className="py-4 px-4">
                      <div
                        className="h-4 bg-base-200 rounded"
                        style={{ width: `${50 + Math.random() * 40}%` }}
                      ></div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination skeleton */}
        <div className="flex justify-between items-center px-4 py-3 border-t border-base-200">
          <div className="h-3 w-44 bg-base-200 rounded"></div>
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-7 w-7 bg-base-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
