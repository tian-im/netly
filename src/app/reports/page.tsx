import { Suspense } from 'react';
import ReportsClient from './reports-client';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getPeriodDates } from '@/lib/links';
import { mapPreferenceToDashboardPeriod } from '@/lib/dates';
import { PREFERENCES, getPreferenceFromCookies } from '@/lib/preferences';

export const revalidate = 0; // Disable caching so reports are always fresh

interface PageProps {
  searchParams: {
    start?: string;
    end?: string;
    cur?: string;
    comparePrior?: string;
  };
}

export default function ReportsPage({ searchParams }: PageProps) {
  // WHY: Reading the date-range preference from a cookie instead of localStorage
  // lets the server redirect with the correct default start/end dates on first
  // render, avoiding a client-side useEffect → URL-push → second-SSR cycle.
  const start = searchParams.start;
  const end = searchParams.end;

  const cookieStore = cookies();
  // WHY: Reading the preferred currency from the cookie lets the server pass it
  // as a prop to the client, eliminating the client-side getPreferredCurrency() call.
  const preferredCurrency = getPreferenceFromCookies(cookieStore, PREFERENCES.defaultCurrency);

  if (!start || !end) {
    // WHY: Using PREFERENCES.dateRange.key instead of a raw string keeps the cookie
    // key centralised — if the key changes in preferences.ts, this stays in sync.
    const prefRange = cookieStore.get(PREFERENCES.dateRange.key)?.value || PREFERENCES.dateRange.default;
    const periodKey = mapPreferenceToDashboardPeriod(prefRange);
    const now = new Date();
    const { firstDay, lastDay } = getPeriodDates(periodKey, now);
    const startStr = firstDay.toISOString().split('T')[0];
    const endStr = lastDay.toISOString().split('T')[0];

    const params = new URLSearchParams();
    params.set('start', startStr);
    params.set('end', endStr);
    // If no cur param is present, use the preferred currency from the cookie
    params.set('cur', searchParams.cur || preferredCurrency);
    if (searchParams.comparePrior) params.set('comparePrior', searchParams.comparePrior);

    redirect(`/reports?${params.toString()}`);
  }

  return (
    <Suspense fallback={
      <div className="flex flex-col justify-center items-center py-24 gap-3">
        <span className="loading loading-spinner loading-md text-primary"></span>
      </div>
    }>
      <ReportsClient preferredCurrency={preferredCurrency} />
    </Suspense>
  );
}
