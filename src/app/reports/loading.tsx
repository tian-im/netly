export default function ReportsLoading() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-pulse">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="h-8 w-64 bg-base-300 rounded-lg"></div>
          <div className="h-4 w-96 bg-base-300 rounded-lg mt-2"></div>
        </div>
        <div className="h-8 w-44 bg-base-300 rounded-lg"></div>
      </div>

      {/* Date Filters Card */}
      <div className="card bg-base-100 shadow border border-base-200">
        <div className="card-body p-5 flex flex-col md:flex-row items-end gap-4 justify-between">
          <div className="flex flex-col md:flex-row gap-4 flex-1 w-full">
            <div className="form-control flex-1">
              <div className="h-4 w-20 bg-base-300 rounded-lg mb-2"></div>
              <div className="h-8 w-full bg-base-200 rounded-lg"></div>
            </div>
            <div className="form-control flex-1">
              <div className="h-4 w-20 bg-base-300 rounded-lg mb-2"></div>
              <div className="h-8 w-full bg-base-200 rounded-lg"></div>
            </div>
          </div>
          <div className="h-8 w-32 bg-base-300 rounded-lg w-full md:w-auto"></div>
        </div>
      </div>

      {/* Accordion panel skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-base-100 shadow border border-base-200 rounded-xl p-6">
            <div className="flex justify-between items-center">
              <div className="h-6 w-48 bg-base-300 rounded-lg"></div>
              <div className="h-6 w-32 bg-base-300 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
