import { Suspense } from 'react';
import ReportsClient from './reports-client';

export const revalidate = 0; // Disable caching so reports are always fresh

export default function ReportsPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col justify-center items-center py-24 gap-3">
        <span className="loading loading-spinner loading-md text-primary"></span>
      </div>
    }>
      <ReportsClient />
    </Suspense>
  );
}
