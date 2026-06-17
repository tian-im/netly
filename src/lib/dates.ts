/**
 * Formats a Date object, string, or number representation of a date
 * into a standard YYYY-MM-DD string representation in UTC.
 */
export function formatDateISO(date: Date | string | number = new Date()): string {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
}
