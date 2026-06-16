export default function AccountsLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden="true">
      {/* Title skeleton */}
      <div>
        <div className="h-8 bg-base-300 rounded-lg w-1/3"></div>
        <div className="h-4 bg-base-200 rounded-lg w-1/2 mt-2"></div>
      </div>

      {/* Main grid: table + form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accounts table card skeleton */}
        <div className="lg:col-span-2">
          <div className="card bg-base-100 shadow-xl border border-base-200">
            <div className="card-body">
              {/* Header with search/filter */}
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div className="h-6 bg-base-300 rounded-lg w-48"></div>
                <div className="flex items-center gap-2">
                  <div className="h-8 bg-base-200 rounded-lg w-28"></div>
                  <div className="h-8 bg-base-200 rounded-lg w-40"></div>
                </div>
              </div>

              {/* Table rows skeleton */}
              <div className="mt-6 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex justify-between items-center py-3 border-b border-base-200/50">
                    <div className="space-y-2">
                      <div className="h-4 bg-base-300 rounded-lg w-36"></div>
                      <div className="h-3 bg-base-200 rounded-lg w-20"></div>
                    </div>
                    <div className="h-4 bg-base-200 rounded-lg w-24"></div>
                    <div className="h-4 bg-base-300 rounded-lg w-20"></div>
                    <div className="flex gap-2">
                      <div className="h-6 bg-base-200 rounded-lg w-12"></div>
                      <div className="h-6 bg-base-200 rounded-lg w-12"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Create form card skeleton */}
        <div>
          <div className="card bg-base-100 shadow-xl border border-base-200">
            <div className="card-body">
              <div className="h-6 bg-base-300 rounded-lg w-36 mb-4"></div>
              <div className="space-y-4">
                <div>
                  <div className="h-4 bg-base-200 rounded-lg w-24 mb-2"></div>
                  <div className="h-10 bg-base-200 rounded-lg w-full"></div>
                </div>
                <div>
                  <div className="h-4 bg-base-200 rounded-lg w-24 mb-2"></div>
                  <div className="h-10 bg-base-200 rounded-lg w-full"></div>
                </div>
                <div>
                  <div className="h-4 bg-base-200 rounded-lg w-24 mb-2"></div>
                  <div className="h-10 bg-base-200 rounded-lg w-full"></div>
                </div>
                <div className="h-10 bg-base-300 rounded-lg w-full mt-2"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
