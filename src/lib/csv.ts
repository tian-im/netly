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
  headerMap: { date: string; payee: string; amount?: string; debit?: string; credit?: string; description?: string },
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
  
  const requiredFields = ['date', 'payee'] as const;
  for (const field of requiredFields) {
    const headerName = headerMap[field];
    if (!headers.includes(headerName)) {
      throw new Error(`Required header "${headerName}" not found in CSV`);
    }
  }

  // Verify amount-related headers
  if (headerMap.amount) {
    if (!headers.includes(headerMap.amount)) {
      throw new Error(`Required header "${headerMap.amount}" not found in CSV`);
    }
  } else if (headerMap.debit || headerMap.credit) {
    if (headerMap.debit && !headers.includes(headerMap.debit)) {
      throw new Error(`Debit header "${headerMap.debit}" not found in CSV`);
    }
    if (headerMap.credit && !headers.includes(headerMap.credit)) {
      throw new Error(`Credit header "${headerMap.credit}" not found in CSV`);
    }
  } else {
    throw new Error('Either Amount column or Debit/Credit columns must be mapped');
  }

  const parsedTransactions: ParsedTransaction[] = [];

  for (const row of parseResult.data as Record<string, string>[]) {
    try {
      const dateVal = row[headerMap.date];
      const payeeVal = row[headerMap.payee];
      
      const descHeader = headerMap.description;
      const descVal = descHeader ? row[descHeader] : null;

      if (!dateVal || !payeeVal) {
        continue; // Skip incomplete rows
      }

      // Calculate amount based on single or double column setup
      let amount = NaN;
      if (headerMap.amount) {
        const amountVal = row[headerMap.amount];
        if (amountVal) {
          amount = cleanAmount(amountVal);
        }
      } else {
        const debitVal = headerMap.debit ? row[headerMap.debit] : '';
        const creditVal = headerMap.credit ? row[headerMap.credit] : '';

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
      // Skip row if error occurs (e.g. date parsing fails)
      continue;
    }
  }

  return parsedTransactions;
}
