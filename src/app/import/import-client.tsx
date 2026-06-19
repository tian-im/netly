'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useTranslations, useFormatter } from 'next-intl';
import Papa from 'papaparse';
import { cleanAmount, parseBankDate, debitCreditToAmount } from '@/lib/csv';
import { getCurrencySymbol, DEFAULT_CURRENCY } from '@/lib/currencies';
import { buildAccountsUrl, buildTransactionsUrl } from '@/lib/links';
import { FileText, Inbox, XCircle, CheckCircle, AlertTriangle, BarChart3 } from 'lucide-react';
import { findDuplicateGroups } from '@/app/actions';

interface Account {
  id: string;
  name: string;
  type: string;
  currency: string;
}

interface PreviewTransaction {
  rawDate: string;
  parsedDate: Date | null;
  payee: string;
  amount: number;
  description: string;
}

interface ImportClientProps {
  initialAccounts: Account[];
}

export default function ImportClient({ initialAccounts }: ImportClientProps) {
  const t = useTranslations('import');
  const tTransactions = useTranslations('transactions');
  const format = useFormatter();
  
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [selectedAccountId, setSelectedAccountId] = useState(initialAccounts[0]?.id || '');
  const [file, setFile] = useState<File | null>(null);
  const [duplicateCount, setDuplicateCount] = useState<number | null>(null);
  const [duplicateScanError, setDuplicateScanError] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [csvSampleValues, setCsvSampleValues] = useState<Record<string, string>>({});
  const [totalRowsCount, setTotalRowsCount] = useState(0);
  const [csvText, setCsvText] = useState('');
  
  // Mapping state
  const [dateHeader, setDateHeader] = useState('');
  const [payeeHeader, setPayeeHeader] = useState('');
  const [amountHeader, setAmountHeader] = useState('');
  const [debitHeader, setDebitHeader] = useState('');
  const [creditHeader, setCreditHeader] = useState('');
  const [descHeader, setDescHeader] = useState('');
  const [dateFormatHint, setDateFormatHint] = useState('DD/MM/YYYY');
  const [useSeparateDebitCredit, setUseSeparateDebitCredit] = useState(false);
  const [hasHeaders, setHasHeaders] = useState(true);

  // Drag and Drop state
  const [isDragging, setIsDragging] = useState(false);

  // Currency symbol derived from selected account
  const selectedCurrency = accounts.find(a => a.id === selectedAccountId)?.currency || DEFAULT_CURRENCY;
  const currencySymbol = getCurrencySymbol(selectedCurrency);

  // Status state
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    processFile(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (droppedFile.name.toLowerCase().endsWith('.csv')) {
        processFile(droppedFile);
      } else {
        setErrorMessage(t('invalidFileType'));
      }
    }
  };

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    setImportResult(null);
    setErrorMessage('');
    setDuplicateCount(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      let text = event.target?.result as string;

      // Strip UTF-8 BOM if present
      if (text.charCodeAt(0) === 0xFEFF) {
        text = text.substring(1);
      }

      setCsvText(text);

      // Parse CSV as arrays (header: false) so we handle both modes uniformly
      Papa.parse(text, {
        header: false,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as string[][];
          if (rows && rows.length > 0) {
            if (hasHeaders) {
              // First row contains header names
              const headers = rows[0].map(h => h.trim());
              setCsvHeaders(headers);

              const dataRows = rows.slice(1).filter(row => row.some(cell => cell.trim() !== ''));
              setCsvRows(dataRows);
              setTotalRowsCount(dataRows.length);

              // Populate first row sample values keyed by header name
              const samples: Record<string, string> = {};
              const firstDataRow = dataRows[0];
              if (headers && firstDataRow) {
                headers.forEach((h, idx) => {
                  samples[h] = (firstDataRow[idx] || '').trim();
                });
              }
              setCsvSampleValues(samples);

              // Try to auto-detect mappings based on keyword matches
              autoDetectHeaders(headers);
            } else {
              // No headers — use column indices as keys
              const numCols = Math.max(...rows.map(r => r.length));
              const colKeys = Array.from({ length: numCols }, (_, i) => String(i));
              setCsvHeaders(colKeys);

              setCsvRows(rows);
              setTotalRowsCount(rows.length);

              // Populate first row sample values keyed by column index
              const samples: Record<string, string> = {};
              const firstRow = rows[0];
              if (firstRow) {
                for (let i = 0; i < firstRow.length; i++) {
                  samples[String(i)] = (firstRow[i] || '').trim();
                }
              }
              setCsvSampleValues(samples);

              // Reset mapping state for headerless mode (no header names to match)
              setDateHeader('');
              setPayeeHeader('');
              setAmountHeader('');
              setDebitHeader('');
              setCreditHeader('');
              setDescHeader('');
              setUseSeparateDebitCredit(false);
            }
          } else {
            setErrorMessage(t('emptyCsv'));
          }
        },
        error: (err: any) => {
          setErrorMessage(t('failedToReadCsv', { message: err.message }));
        }
      });
    };
    reader.readAsText(selectedFile);
  };

  const autoDetectHeaders = (headers: string[]) => {
    // Helper to check and set if not already defined or invalid
    const detectField = (
      current: string,
      keywords: RegExp,
      excludeRegex: RegExp[] = [],
      excludeStrings: string[] = []
    ): string => {
      if (headers.includes(current)) return current;
      const found = headers.find(
        (h) =>
          keywords.test(h) &&
          !excludeRegex.some((rx) => rx.test(h)) &&
          !excludeStrings.includes(h)
      );
      return found || '';
    };

    // Auto date
    const dateMatch = detectField(dateHeader, /date/i);
    if (dateMatch) setDateHeader(dateMatch);

    // Auto payee
    const payeeMatch = detectField(payeeHeader, /payee|merchant|description|narrative/i);
    if (payeeMatch) setPayeeHeader(payeeMatch);

    // Auto amount
    const amountMatch = detectField(amountHeader, /amount|value/i, [/debit/i, /credit/i]);
    if (amountMatch) setAmountHeader(amountMatch);

    // Auto debit
    const debitMatch = detectField(debitHeader, /debit/i);
    if (debitMatch) setDebitHeader(debitMatch);

    // Auto credit
    const creditMatch = detectField(creditHeader, /credit/i);
    if (creditMatch) setCreditHeader(creditMatch);

    // Auto description
    const descMatch = detectField(descHeader, /details|memo|particulars|notes/i, [], [payeeMatch]);
    if (descMatch) setDescHeader(descMatch);

    // Auto toggling between Debit/Credit vs Single Amount
    const hasDebit = headers.some((h) => /debit/i.test(h));
    const hasCredit = headers.some((h) => /credit/i.test(h));
    if (hasDebit || hasCredit) {
      setUseSeparateDebitCredit(true);
    } else {
      setUseSeparateDebitCredit(false);
    }
  };

  const previewTransactions = useMemo((): PreviewTransaction[] => {
    if (csvRows.length === 0) return [];
    
    const previewList: PreviewTransaction[] = [];
    const dateIdx = csvHeaders.indexOf(dateHeader);
    const payeeIdx = csvHeaders.indexOf(payeeHeader);
    const amountIdx = !useSeparateDebitCredit ? csvHeaders.indexOf(amountHeader) : -1;
    const debitIdx = useSeparateDebitCredit ? csvHeaders.indexOf(debitHeader) : -1;
    const creditIdx = useSeparateDebitCredit ? csvHeaders.indexOf(creditHeader) : -1;
    const descIdx = csvHeaders.indexOf(descHeader);

    // Basic requirements for a preview
    if (dateIdx === -1 || payeeIdx === -1) return [];
    if (!useSeparateDebitCredit && amountIdx === -1) return [];
    if (useSeparateDebitCredit && debitIdx === -1 && creditIdx === -1) return [];

    // Map first 3 rows for preview
    for (const row of csvRows.slice(0, 3)) {
      try {
        const dateVal = row[dateIdx];
        const payeeVal = row[payeeIdx];
        const descVal = descIdx !== -1 ? row[descIdx] : '';

        let amount = NaN;
        if (!useSeparateDebitCredit) {
          const amountVal = row[amountIdx];
          if (amountVal) amount = cleanAmount(amountVal);
        } else {
          const debitVal = debitIdx !== -1 ? row[debitIdx] : '';
          const creditVal = creditIdx !== -1 ? row[creditIdx] : '';

          amount = debitCreditToAmount(debitVal, creditVal);
        }

        let parsedDate: Date | null = null;
        try {
          if (dateVal) {
            parsedDate = parseBankDate(dateVal, dateFormatHint);
          }
        } catch (e) {
          console.warn('Date parsing failed in preview:', dateVal, e);
        }

        previewList.push({
          rawDate: dateVal || '',
          parsedDate,
          payee: payeeVal || '',
          amount,
          description: descVal || '',
        });
      } catch (e) {
        console.warn('Row parsing failed in preview:', e);
      }
    }
    return previewList;
  }, [csvRows, csvHeaders, dateHeader, payeeHeader, amountHeader, debitHeader, creditHeader, descHeader, useSeparateDebitCredit, dateFormatHint]);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAccountId || !csvText || !dateHeader || !payeeHeader) {
      setErrorMessage(t('noAccountError') || t('noMappingError'));
      return;
    }
    
    if (!useSeparateDebitCredit && !amountHeader) {
      setErrorMessage(t('noAmountMappingError'));
      return;
    }
    
    if (useSeparateDebitCredit && !debitHeader && !creditHeader) {
      setErrorMessage(t('noAmountMappingError'));
      return;
    }

    setErrorMessage('');
    setImportResult(null);
    setDuplicateCount(null);
    setDuplicateScanError(false);
    setImporting(true);

    const headerMap = useSeparateDebitCredit
      ? {
          date: dateHeader,
          payee: payeeHeader,
          debit: debitHeader || undefined,
          credit: creditHeader || undefined,
          description: descHeader || undefined
        }
      : {
          date: dateHeader,
          payee: payeeHeader,
          amount: amountHeader,
          description: descHeader || undefined
        };

    try {
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          csvText,
          accountId: selectedAccountId,
          headerMap,
          dateFormatHint,
          hasHeaders,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setImportResult({ success: true, message: t('importSuccess', { count: result.importedCount }) });
        // Reset file inputs but preserve mapping selections
        setFile(null);
        setCsvHeaders([]);
        setCsvText('');
        setCsvRows([]);
        setTotalRowsCount(0);

        // Fetch duplicate groups for the imported date range
        if (result.minDate && result.maxDate && result.importedCount > 0) {
          try {
            const allDuplicateGroups = await findDuplicateGroups({
              accountId: selectedAccountId,
              fuzzy: false
            });
            const minTime = new Date(result.minDate).getTime();
            const maxTime = new Date(result.maxDate).getTime();
            const duplicateGroups = allDuplicateGroups.filter(g =>
              g.transactions.some(tx => {
                const tTime = new Date(tx.date).getTime();
                return tTime >= minTime && tTime <= maxTime;
              })
            );
            const count = duplicateGroups.reduce((acc, g) => acc + (g.transactions.length - 1), 0);
            if (count > 0) {
              setDuplicateCount(count);
            }
          } catch (dupErr) {
            // WHY: If the duplicate scan fails, we catch the error to prevent the successful import UI state from being blocked, but set a warning flag to alert the user.
            console.error('Failed to find duplicates post-import:', dupErr);
            setDuplicateScanError(true);
          }
        }
      } else {
        setImportResult({ success: false, message: result.error ? resolveErrorMessage(result.errorCode, result.error) : t('importFailed') });
      }
    } catch (err: any) {
      setImportResult({ success: false, message: err.message || t('connectionError') });
    } finally {
      setImporting(false);
    }
  };

  // Validation: all required mappings must be set, and file must be loaded
  const isValid = useMemo(() => {
    if (!selectedAccountId || !csvText || !dateHeader || !payeeHeader) return false;
    if (!useSeparateDebitCredit && !amountHeader) return false;
    if (useSeparateDebitCredit && !debitHeader && !creditHeader) return false;
    return true;
  }, [selectedAccountId, csvText, dateHeader, payeeHeader, amountHeader, debitHeader, creditHeader, useSeparateDebitCredit]);

  // Map API error codes to i18n keys for localised error display
  // WHY: Using structured errorCode instead of substring matching on English messages
  // ensures robustness if API error text changes. Falls back to the raw error message
  // if no code match is found, maintaining backward compatibility.
  const resolveErrorMessage = (errorCode: string | undefined, fallback: string): string => {
    switch (errorCode) {
      case 'ERR_IMPORT_MISSING_PARAMS': return t('error.missingParameters');
      case 'ERR_IMPORT_ACCOUNT_NOT_FOUND': return t('error.accountNotFound');
      case 'ERR_IMPORT_NO_TRANSACTIONS': return t('error.noTransactionsParsed');
      case 'ERR_IMPORT_INTERNAL': return t('error.internalError');
      default: return fallback;
    }
  };

  const renderDropdownOptionText = (headerKey: string) => {
    const label = hasHeaders ? headerKey : `Column ${headerKey}`;
    const sample = csvSampleValues[headerKey];
    if (sample) {
      const chars = Array.from(sample);
      const truncatedSample = chars.length > 20 ? `${chars.slice(0, 17).join('')}…` : sample;
      return `${label} (${truncatedSample})`;
    }
    return label;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-base-content">
          {t('pageTitle')}
        </h1>
        <p className="text-base-content/60 text-sm mt-1">
          {t('columnMappingDesc')}
        </p>
      </div>

      <div className="card bg-base-100 shadow-xl border border-base-200">
        <div className="card-body">
          {accounts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-base-content/60">{t('noAccountsWarning')}</p>
              <Link href={buildAccountsUrl()} className="btn btn-primary mt-4 btn-sm">
                {t('goCreateAccount')}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleImport} className="space-y-6">
              {/* Form Row 1: Account selection & File drag-and-drop */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-bold text-base-content/80">{t('selectAccountField')}</span>
                  </label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="select select-bordered w-full"
                    required
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-bold text-base-content/80">{t('importCardTitle')}</span>
                  </label>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={t('dropzonePlaceholder')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        document.getElementById('file-input-field')?.click();
                      }
                    }}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-primary ${
                      isDragging
                        ? 'border-primary bg-primary/10 scale-[0.99]'
                        : file
                        ? 'border-success/50 bg-success/5'
                        : 'border-base-300 hover:border-primary/50 hover:bg-base-200/50'
                    }`}
                    onClick={() => document.getElementById('file-input-field')?.click()}
                  >
                    <input
                      id="file-input-field"
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="space-y-2">
                      <div className="flex justify-center">
                        {file ? (
                          <FileText className="h-8 w-8 text-success" />
                        ) : (
                          <Inbox className="h-8 w-8 text-base-content/30" />
                        )}
                      </div>
                      <div className="text-sm font-medium">
                        {file ? (
                          <span className="text-success font-semibold">{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                        ) : (
                          <span>{t('dropzonePlaceholder')}</span>
                        )}
                      </div>
                      <p className="text-xs text-base-content/40">{t('onlyCsvSupported')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status and Results */}
              {errorMessage && (
                <div className="alert alert-error text-sm py-3 shadow">
                  <span className="flex items-center gap-2">
                    <XCircle className="h-4 w-4" /> {errorMessage}
                  </span>
                </div>
              )}

              {importResult && (
                <div className={`alert ${importResult.success ? 'alert-success' : 'alert-error'} text-sm py-3 shadow flex justify-between items-center`}>
                  <div className="flex items-center gap-2">
                    <span>
                      {importResult.success ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                    </span>
                    <span>{importResult.message}</span>
                  </div>
                  {importResult.success && (
                    <Link href={buildTransactionsUrl()} className="btn btn-xs btn-outline border-success-content/20 hover:bg-success-content/10">
                      {t('viewTransactions')} →
                    </Link>
                  )}
                </div>
              )}

              {duplicateCount !== null && duplicateCount > 0 && (
                <div className="alert alert-warning text-sm py-3 shadow flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning-content" />
                    <div>
                      <span className="font-bold">{tTransactions('duplicateAlertTitle')}: </span>
                      <span>{tTransactions('duplicateAlertDesc', { count: duplicateCount })}</span>
                    </div>
                  </div>
                  <Link href={buildTransactionsUrl(new URLSearchParams({ accountId: selectedAccountId, duplicates: 'true' }))} className="btn btn-xs btn-outline border-warning-content/20 hover:bg-warning-content/10">
                    {tTransactions('reviewDuplicatesBtn')} →
                  </Link>
                </div>
              )}

              {duplicateScanError && (
                <div className="alert alert-warning text-sm py-3 shadow flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning-content" />
                    <span>{t('duplicateScanFailedWarning')}</span>
                  </div>
                </div>
              )}

              {/* Mapper Interface (Shows only when file is parsed) */}
              {csvHeaders.length > 0 && (
                <div className="bg-base-200/50 p-6 rounded-2xl space-y-4 border border-base-300">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <div>
                      <h3 className="text-md font-bold uppercase tracking-wider text-primary">
                        {t('columnMappingTitle')}
                      </h3>
                      <p className="text-xs text-base-content/60 mt-0.5">
                        {t('columnMappingDesc')}
                      </p>
                    </div>
                    
                    <div className="text-xs text-base-content/75 font-semibold bg-base-300/60 px-3 py-1.5 rounded-lg border border-base-300 flex items-center gap-1.5">
                      <BarChart3 className="h-3.5 w-3.5 text-primary" /> {t('totalRowsDetected', { count: totalRowsCount })}
                    </div>
                  </div>

                  {/* Toggle between Single and Separate Amount Columns */}
                  <div className="form-control w-fit bg-base-100 p-2.5 rounded-xl border border-base-200 shadow-sm">
                    <span className="label-text font-bold mb-1.5 block">{t('amountMappingType')}</span>
                    <div className="flex gap-4">
                      <label className="label cursor-pointer gap-2 py-0">
                        <input
                          type="radio"
                          name="amountType"
                          className="radio radio-primary radio-sm"
                          checked={!useSeparateDebitCredit}
                          onChange={() => setUseSeparateDebitCredit(false)}
                        />
                        <span className="label-text text-xs">{t('amountField')}</span>
                      </label>
                      <label className="label cursor-pointer gap-2 py-0">
                        <input
                          type="radio"
                          name="amountType"
                          className="radio radio-primary radio-sm"
                          checked={useSeparateDebitCredit}
                          onChange={() => setUseSeparateDebitCredit(true)}
                        />
                        <span className="label-text text-xs">{t('useSplitColumns')}</span>
                      </label>
                    </div>
                  </div>

                  {/* Toggle: CSV has headers or not */}
                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-3 w-fit py-1">
                      <input
                        type="checkbox"
                        className="toggle toggle-primary toggle-sm"
                        checked={hasHeaders}
                        onChange={(e) => {
                          setHasHeaders(e.target.checked);
                          // Reset file so user re-uploads with the new mode
                          setFile(null);
                          setCsvHeaders([]);
                          setCsvRows([]);
                          setCsvSampleValues({});
                          setTotalRowsCount(0);
                          setCsvText('');
                          setDateHeader('');
                          setPayeeHeader('');
                          setAmountHeader('');
                          setDebitHeader('');
                          setCreditHeader('');
                          setDescHeader('');
                        }}
                      />
                      <span className="label-text text-xs font-medium">{t('hasHeadersToggle')}</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-bold">{t('dateField')}</span>
                      </label>
                      <select
                        value={dateHeader}
                        onChange={(e) => setDateHeader(e.target.value)}
                        className="select select-bordered w-full select-sm"
                        required
                      >
                        <option value="">{t('selectPlaceholder')}</option>
                        {csvHeaders.map((h) => (
                          <option key={h} value={h}>{renderDropdownOptionText(h)}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-bold">{t('dateLayoutFormat')}</span>
                      </label>
                      <select
                        value={dateFormatHint}
                        onChange={(e) => setDateFormatHint(e.target.value)}
                        className="select select-bordered w-full select-sm"
                      >
                        <option value="DD/MM/YYYY">{t('dateFormatDmy')}</option>
                        <option value="MM/DD/YYYY">{t('dateFormatMdy')}</option>
                        <option value="YYYY-MM-DD">{t('dateFormatIso')}</option>
                      </select>
                    </div>

                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-bold">{t('payeeField')}</span>
                      </label>
                      <select
                        value={payeeHeader}
                        onChange={(e) => setPayeeHeader(e.target.value)}
                        className="select select-bordered w-full select-sm"
                        required
                      >
                        <option value="">{t('selectPlaceholder')}</option>
                        {csvHeaders.map((h) => (
                          <option key={h} value={h}>{renderDropdownOptionText(h)}</option>
                        ))}
                      </select>
                    </div>

                    {/* Conditional Amount/Debit/Credit Fields */}
                    {!useSeparateDebitCredit ? (
                      <div className="form-control w-full">
                        <label className="label">
                          <span className="label-text font-bold">{t('amountField')}</span>
                        </label>
                        <select
                          value={amountHeader}
                          onChange={(e) => setAmountHeader(e.target.value)}
                          className="select select-bordered w-full select-sm"
                          required={!useSeparateDebitCredit}
                        >
                          <option value="">{t('selectPlaceholder')}</option>
                          {csvHeaders.map((h) => (
                            <option key={h} value={h}>{renderDropdownOptionText(h)}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <>
                        <div className="form-control w-full">
                          <label className="label">
                            <span className="label-text font-bold">{t('debitColumnField')}</span>
                          </label>
                          <select
                            value={debitHeader}
                            onChange={(e) => setDebitHeader(e.target.value)}
                            className="select select-bordered w-full select-sm"
                          >
                            <option value="">{t('selectPlaceholder')}</option>
                            {csvHeaders.map((h) => (
                              <option key={h} value={h}>{renderDropdownOptionText(h)}</option>
                            ))}
                          </select>
                        </div>

                        <div className="form-control w-full">
                          <label className="label">
                            <span className="label-text font-bold">{t('creditColumnField')}</span>
                          </label>
                          <select
                            value={creditHeader}
                            onChange={(e) => setCreditHeader(e.target.value)}
                            className="select select-bordered w-full select-sm"
                          >
                            <option value="">{t('selectPlaceholder')}</option>
                            {csvHeaders.map((h) => (
                              <option key={h} value={h}>{renderDropdownOptionText(h)}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-bold">{t('descriptionColumn')}</span>
                      </label>
                      <select
                        value={descHeader}
                        onChange={(e) => setDescHeader(e.target.value)}
                        className="select select-bordered w-full select-sm"
                      >
                        <option value="">{t('noneOption')}</option>
                        {csvHeaders.map((h) => (
                          <option key={h} value={h}>{renderDropdownOptionText(h)}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Dynamic Data Preview Section */}
                  {dateHeader && payeeHeader && (!useSeparateDebitCredit ? amountHeader : (debitHeader || creditHeader)) && (
                    <div className="mt-6 border border-base-300 rounded-xl overflow-hidden bg-base-100 shadow-inner">
                      <div className="bg-base-200/60 px-4 py-2.5 border-b border-base-300 flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-wider text-base-content/70">
                          {t('previewDataTitle')}
                        </span>
                        <span className="text-[10px] text-base-content/50 font-semibold bg-base-300 px-2 py-0.5 rounded">
                          {t('parsedLive')}
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="table table-xs w-full">
                          <thead>
                            <tr className="bg-base-200/20 text-base-content/60">
                              <th>{t('previewHeaderDate')}</th>
                              <th>{t('previewHeaderPayee')}</th>
                              <th className="text-right">{t('previewHeaderAmount')}</th>
                              <th>{t('previewHeaderDescription')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {previewTransactions.map((tx, idx) => (
                              <tr key={idx} className="hover border-b border-base-200/50">
                                <td className="whitespace-nowrap">
                                  {tx.parsedDate ? (
                                    <span className="text-success font-medium">
                                      {format.dateTime(tx.parsedDate, { year: 'numeric', month: '2-digit', day: '2-digit' })}
                                    </span>
                                  ) : (
                                    <span className="text-error italic flex items-center gap-1" title={t('dateParseTooltip')}>
                                      <AlertTriangle className="h-3 w-3" /> {tx.rawDate || t('fallbackEmpty')}
                                    </span>
                                  )}
                                </td>
                                <td className="max-w-[200px] truncate font-medium">
                                  {tx.payee || <span className="text-base-content/30 italic">{t('fallbackNone')}</span>}
                                </td>
                                <td className={`text-right font-mono font-bold ${tx.amount < 0 ? 'text-error' : 'text-success'}`}>
                                  {!isNaN(tx.amount) ? (
                                    <>
                                      {tx.amount < 0 ? '-' : '+'}
                                      {currencySymbol}{Math.abs(tx.amount).toFixed(2)}
                                    </>
                                  ) : (
                                    <span className="text-error italic">{t('fallbackInvalid')}</span>
                                  )}
                                </td>
                                <td className="max-w-[250px] truncate text-base-content/70">
                                  {tx.description || <span className="text-base-content/20 italic">{t('fallbackEmpty')}</span>}
                                </td>
                              </tr>
                            ))}
                            {previewTransactions.length === 0 && (
                              <tr>
                                <td colSpan={4} className="text-center py-4 text-base-content/40 italic">
                                  {t('previewMappingFailed')}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="card-actions flex-col items-stretch mt-6">
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={!isValid || importing}
                      >
                         {importing ? t('importing') : t('importButton', { count: totalRowsCount })}
                      </button>
                    </div>
                    {importing && (
                      <progress
                        className="progress progress-primary w-full"
                        aria-label={t('importing')}
                      />
                    )}
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
