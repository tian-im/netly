import Papa from 'papaparse';

export interface ParsedTransaction {
  date: Date;
  payee: string;
  amount: number;
  description: string | null;
}

/**
 * Cleans currency strings and converts them to floats.
 * Handles commas, dollar signs, other currency indicators, and parentheses as negative signs.
 */
export function cleanAmount(value: string): number {
  if (!value) return NaN;
  
  let cleaned = value.trim();
  
  // Check for parentheses negative format e.g., (100) or ($1,500.50)
  const isParenthesesNegative = cleaned.startsWith('(') && cleaned.endsWith(')');
  if (isParenthesesNegative) {
    cleaned = cleaned.substring(1, cleaned.length - 1);
  }

  // Remove currency symbols, commas, spaces
  cleaned = cleaned.replace(/[$,£€\s]/g, '');

  let amount = parseFloat(cleaned);
  
  if (isParenthesesNegative) {
    amount = -amount;
  }

  return amount;
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
  // Try YYYY-MM-DD first
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    const date = new Date(cleaned);
    if (!isNaN(date.getTime())) return date;
  }

  // Try parsing common DD/MM/YYYY format with slashes or dashes
  const parts = cleaned.split(/[-/]/);
  if (parts.length === 3) {
    const p1 = parseInt(parts[0], 10);
    const p2 = parseInt(parts[1], 10);
    const p3 = parseInt(parts[2], 10);
    
    // Check if YYYY is at p3
    if (p3 > 1000) {
      // Ambiguous between DD/MM/YYYY and MM/DD/YYYY. Assume DD/MM/YYYY as default if p1 > 12 or both are <= 12
      const isDayFirst = p1 > 12 || (p1 <= 12 && p2 <= 12);
      const day = isDayFirst ? p1 : p2;
      const month = (isDayFirst ? p2 : p1) - 1;
      const date = new Date(p3, month, day);
      if (!isNaN(date.getTime())) return date;
    }
  }

  // Last-resort standard Date parsing
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  throw new Error(`Unparseable date: "${value}"`);
}

/**
 * Parses bank CSV contents using header mappings.
 */
export function parseCSV(
  csvText: string,
  headerMap: { date: string; payee: string; amount: string; description?: string },
  dateFormatHint?: string
): ParsedTransaction[] {
  if (!csvText || csvText.trim() === '') {
    return [];
  }

  // Use PapaParse to parse CSV text
  const parseResult = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
  });

  if (parseResult.errors.length > 0 && parseResult.data.length === 0) {
    throw new Error(`CSV Parsing failed: ${parseResult.errors[0].message}`);
  }

  // Verify headers exist
  const firstRow = parseResult.data[0] as Record<string, string>;
  if (!firstRow) return [];

  const headers = Object.keys(firstRow);
  
  const requiredFields = ['date', 'payee', 'amount'] as const;
  for (const field of requiredFields) {
    const headerName = headerMap[field];
    if (!headers.includes(headerName)) {
      throw new Error(`Required header "${headerName}" not found in CSV`);
    }
  }

  const parsedTransactions: ParsedTransaction[] = [];

  for (const row of parseResult.data as Record<string, string>[]) {
    try {
      const dateVal = row[headerMap.date];
      const payeeVal = row[headerMap.payee];
      const amountVal = row[headerMap.amount];
      
      const descHeader = headerMap.description;
      const descVal = descHeader ? row[descHeader] : null;

      if (!dateVal || !payeeVal || !amountVal) {
        continue; // Skip incomplete rows
      }

      const date = parseBankDate(dateVal, dateFormatHint);
      const amount = cleanAmount(amountVal);

      if (isNaN(amount)) {
        continue; // Skip rows with invalid amounts
      }

      parsedTransactions.push({
        date,
        payee: payeeVal.trim(),
        amount,
        description: descVal ? descVal.trim() : null,
      });
    } catch (e) {
      // Skip row if error occurs (e.g. date parsing fails)
      continue;
    }
  }

  return parsedTransactions;
}
