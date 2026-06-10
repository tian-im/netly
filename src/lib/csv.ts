import Papa from 'papaparse';

export interface ParsedTransaction {
  date: Date;
  payee: string;
  amount: number;
  description: string | null;
}

/**
 * Column mapping for CSV parsing. When hasHeaders=true, values are CSV header names.
 * When hasHeaders=false, values are 0-based column indices as strings (e.g. "0", "1", "2").
 */
export interface ColumnMapping {
  date: string;
  payee: string;
  amount?: string;
  debit?: string;
  credit?: string;
  description?: string;
}

/**
 * Cleans currency strings and converts them to floats.
 * Handles commas, dollar signs, other currency indicators, and parentheses as negative signs.
 */
export function cleanAmount(value: string): number {
  if (!value || value.trim() === '') return NaN;
  
  let cleaned = value.trim();
  
  // Check for parentheses negative format e.g., (100) or ($1,500.50)
  const isParenthesesNegative = cleaned.startsWith('(') && cleaned.endsWith(')');
  if (isParenthesesNegative) {
    cleaned = cleaned.substring(1, cleaned.length - 1);
  }

  // Remove currency symbols, commas, spaces — covers major global symbols
  cleaned = cleaned.replace(/[$,£€¥₩₹₽₱₿\s]/g, '');

  let amount = parseFloat(cleaned);
  
  if (isParenthesesNegative) {
    amount = -amount;
  }

  if (isNaN(amount)) return NaN;
  const sign = amount < 0 ? -1 : 1;
  return (Math.round(Math.abs(amount) * 100) / 100) * sign;
}

/**
 * Parses bank statement dates with various formats.
 */
export function parseBankDate(value: string, formatHint?: string): Date {
  const cleaned = value.trim();
  
  // If a specific format hint is provided
  if (formatHint) {
    if (formatHint === 'DD/MM/YYYY' || formatHint === 'DD-MM-YYYY') {
      const parts = cleaned.split(/[-/]/);
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // 0-indexed month
        const year = parseInt(parts[2], 10);
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) return date;
      }
    } else if (formatHint === 'MM/DD/YYYY' || formatHint === 'MM-DD-YYYY') {
      const parts = cleaned.split(/[-/]/);
      if (parts.length === 3) {
        const month = parseInt(parts[0], 10) - 1;
        const day = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) return date;
      }
    }
  }

  // Fallback / Auto-detection:
  // Try YYYY-MM-DD first — parsed as local midnight like all other code paths,
  // rather than `new Date(string)` which would interpret ISO 8601 as UTC.
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    const [y, m, d] = cleaned.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    // Guard against month/day roll-over (e.g. month 15 → April next year, day 32 → next month)
    if (!isNaN(date.getTime()) && date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d) return date;
    // Pattern matched but roll-over guard failed → structurally invalid (e.g. month 13 or day 32)
    throw new Error(`Invalid ISO date: "${cleaned}" — month or day out of range`);
  }

  // Try parsing common DD/MM/YYYY format with slashes or dashes
  const parts = cleaned.split(/[-/]/);
  if (parts.length === 3) {
    const p1 = parseInt(parts[0], 10);
    const p2 = parseInt(parts[1], 10);
    const p3 = parseInt(parts[2], 10);
    
    // Check if YYYY is at p3
    if (p3 > 1000) {
      // Ambiguous between DD/MM/YYYY and MM/DD/YYYY.
      // If one part > 12, it must be the day (non-month).
      // If both ≤ 12, try both interpretations and prefer whichever
      // passes a sanity check (e.g., the date doesn't silently roll over).
      if (p1 > 12) {
        // Must be DD/MM/YYYY (day 13-31)
        const date = new Date(p3, p2 - 1, p1);
        if (!isNaN(date.getTime())) return date;
      } else if (p2 > 12) {
        // Must be MM/DD/YYYY (day 13-31 in second position)
        const date = new Date(p3, p1 - 1, p2);
        if (!isNaN(date.getTime())) return date;
      } else {
        // Both ≤ 12 — ambiguous (e.g. 03/04/2026 could be Mar 4 or Apr 3).
        // Both interpretations are always valid (days 1-12 fit every month),
        // so we default to DD/MM/YYYY convention.
        const date = new Date(p3, p2 - 1, p1);
        if (!isNaN(date.getTime())) return date;
      }
    }
  }

  // Last-resort standard Date parsing.
  // Note: `new Date(string)` behaviour is engine-dependent (works in V8/Node.js for
  // formats like "03 Jun 26", but not guaranteed by ECMA-262 for all formats).
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  throw new Error(`Unparseable date: "${value}"`);
}

/**
 * Helper: get a value from a CSV row, which may be a header-keyed object or an array.
 * Exported for testing.
 */
export function getRowValue(row: Record<string, string> | string[], key: string): string {
  if (Array.isArray(row)) {
    const idx = parseInt(key, 10);
    if (isNaN(idx) || idx < 0 || idx >= row.length) return '';
    return row[idx] ?? '';
  }
  return row[key] ?? '';
}

/**
 * Parses bank CSV contents using header mappings or column index mappings.
 *
 * When `hasHeaders` is true (default), `columnMapping` values are CSV header names.
 * When `hasHeaders` is false, `columnMapping` values are 0-based column indices as strings (e.g. "0", "1", "2").
 */
export function parseCSV(
  csvText: string,
  columnMapping: ColumnMapping,
  dateFormatHint?: string,
  hasHeaders: boolean = true
): ParsedTransaction[] {
  if (!csvText || csvText.trim() === '') {
    return [];
  }

  // Use PapaParse to parse CSV text
  const parseResult = Papa.parse(csvText, {
    header: hasHeaders,
    skipEmptyLines: 'greedy',
  });

  if (parseResult.errors.length > 0 && parseResult.data.length === 0) {
    throw new Error(`CSV Parsing failed: ${parseResult.errors[0].message}`);
  }

  const rows = parseResult.data as unknown[];

  if (rows.length === 0) return [];

  if (!hasHeaders) {
    // Validate that column mappings are numeric indices in headerless mode.
    // Must be a non-negative integer string like "0", "1", "2".
    // Leading zeros like "01" are rejected (parseInt + String round-trip check)
    // to enforce a canonical format and catch accidental header-name pass-through.
    const indexFields = ['date', 'payee', 'amount', 'debit', 'credit', 'description'] as const;
    for (const field of indexFields) {
      const val = columnMapping[field];
      if (val !== undefined) {
        const num = parseInt(val, 10);
        if (isNaN(num) || num < 0 || String(num) !== val.trim()) {
          throw new Error(`Invalid column index "${val}" for field "${field}" in headerless mode. Must be a non-negative integer.`);
        }
      }
    }
  }

  if (hasHeaders) {
    // Verify headers exist
    const firstRow = rows[0] as Record<string, string>;
    const headers = Object.keys(firstRow);

    const requiredFields = ['date', 'payee'] as const;
    for (const field of requiredFields) {
      const headerName = columnMapping[field];
      if (!headers.includes(headerName)) {
        throw new Error(`Required header "${headerName}" not found in CSV`);
      }
    }

    // Verify amount-related headers
    if (columnMapping.amount) {
      if (!headers.includes(columnMapping.amount)) {
        throw new Error(`Required header "${columnMapping.amount}" not found in CSV`);
      }
    } else if (columnMapping.debit || columnMapping.credit) {
      if (columnMapping.debit && !headers.includes(columnMapping.debit)) {
        throw new Error(`Debit header "${columnMapping.debit}" not found in CSV`);
      }
      if (columnMapping.credit && !headers.includes(columnMapping.credit)) {
        throw new Error(`Credit header "${columnMapping.credit}" not found in CSV`);
      }
    } else {
      throw new Error('Either Amount column or Debit/Credit columns must be mapped');
    }
  }

  const parsedTransactions: ParsedTransaction[] = [];

  for (const rawRow of rows) {
    try {
      const row = rawRow as Record<string, string> | string[];
      const dateVal = getRowValue(row, columnMapping.date);
      const payeeVal = getRowValue(row, columnMapping.payee);

      const descKey = columnMapping.description;
      const descVal = descKey ? getRowValue(row, descKey) : null;

      if (!dateVal || !payeeVal) {
        continue; // Skip incomplete rows
      }

      // Calculate amount based on single or double column setup
      let amount = NaN;
      if (columnMapping.amount) {
        const amountVal = getRowValue(row, columnMapping.amount);
        if (amountVal) {
          amount = cleanAmount(amountVal);
        }
      } else {
        const debitVal = columnMapping.debit ? getRowValue(row, columnMapping.debit) : '';
        const creditVal = columnMapping.credit ? getRowValue(row, columnMapping.credit) : '';

        const debitAmt = debitVal ? cleanAmount(debitVal) : NaN;
        const creditAmt = creditVal ? cleanAmount(creditVal) : NaN;

        const hasDebit = !isNaN(debitAmt) && debitVal.trim() !== '';
        const hasCredit = !isNaN(creditAmt) && creditVal.trim() !== '';

        if (hasDebit && hasCredit) {
          if (debitAmt !== 0 && creditAmt === 0) {
            amount = -Math.abs(debitAmt);
          } else if (creditAmt !== 0 && debitAmt === 0) {
            amount = Math.abs(creditAmt);
          } else {
            // Subtract debit from credit
            amount = Math.round((creditAmt - debitAmt) * 100) / 100;
          }
        } else if (hasDebit) {
          amount = -Math.abs(debitAmt);
        } else if (hasCredit) {
          amount = Math.abs(creditAmt);
        }
      }

      if (isNaN(amount)) {
        continue; // Skip rows with invalid amounts
      }

      const date = parseBankDate(dateVal, dateFormatHint);

      parsedTransactions.push({
        date,
        payee: payeeVal.trim(),
        amount,
        description: descVal ? descVal.trim() : null,
      });
    } catch (e) {
      // Skip row if error occurs (e.g. date parsing fails), but log for debugging
      console.warn('Skipping CSV row due to parse error:', e);
      continue;
    }
  }

  return parsedTransactions;
}
