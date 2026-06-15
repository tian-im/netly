'use client';

import { useState, useEffect, useTransition, useMemo } from 'react';
import { useTranslations, useFormatter } from 'next-intl';
import { getAccounts } from '../actions';
import Papa from 'papaparse';
import { cleanAmount, parseBankDate } from '@/lib/csv';
import { getCurrencySymbol, DEFAULT_CURRENCY } from '@/lib/currencies';
import { FileText, Inbox, XCircle, CheckCircle, AlertTriangle, BarChart3 } from 'lucide-react';

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
  const tCommon = useTranslations('common');
  const format = useFormatter();
  
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [selectedAccountId, setSelectedAccountId] = useState(initialAccounts[0]?.id || '');
  const [file, setFile] = useState<File | null>(null);
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

  // Drag and Drop state
  const [isDragging, setIsDragging] = useState(false);

  // Currency symbol derived from selected account
  const selectedCurrency = accounts.find(a => a.id === selectedAccountId)?.currency || DEFAULT_CURRENCY;
  const currencySymbol = getCurrencySymbol(selectedCurrency);

  // Status state
  const [isPending, startTransition] = useTransition();
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

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

    const reader = new FileReader();
    reader.onload = (event) => {
      let text = event.target?.result as string;

      // Strip UTF-8 BOM if present
      if (text.charCodeAt(0) === 0xFEFF) {
        text = text.substring(1);
      }

      setCsvText(text);

      // Parse headers using PapaParse
      Papa.parse(text, {
        skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as string[][];
          if (rows && rows.length > 0) {
            const headers = rows[0].map(h => h.trim());
            setCsvHeaders(headers);
            
            const dataRows = rows.slice(1).filter(row => row.some(cell => cell.trim() !== ''));
            setCsvRows(dataRows);
            setTotalRowsCount(dataRows.length);

            // Populate first row sample values
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

    // Map first 5 rows
    for (const row of csvRows.slice(0, 5)) {
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
              amount = Math.round((creditAmt - debitAmt) * 100) / 100;
            }
          } else if (hasDebit) {
            amount = -Math.abs(debitAmt);
          } else if (hasCredit) {
            amount = Math.abs(creditAmt);
          }
        }

        let parsedDate: Date | null = null;
        try {
          if (dateVal) {
            parsedDate = parseBankDate(dateVal, dateFormatHint);
          }
        } catch (e) {}

        previewList.push({
          rawDate: dateVal || '',
          parsedDate,
          payee: payeeVal || '',
          amount,
          description: descVal || '',
        });
      } catch (e) {}
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

    startTransition(async () => {
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
        } else {
          setImportResult({ success: false, message: result.error || t('importFailed') });
        }
      } catch (err: any) {
        setImportResult({ success: false, message: err.message || t('connectionError') });
      }
    });
  };

  const renderDropdownOptionText = (headerName: string) => {
    const sample = csvSampleValues[headerName];
    if (sample) {
      const truncatedSample = sample.length > 20 ? `${sample.substring(0, 17)}...` : sample;
      return `${headerName} (${truncatedSample})`;
    }
    return headerName;
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
              <a href="/accounts" className="btn btn-primary mt-4 btn-sm">{t('goCreateAccount')}</a>
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
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
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
                    <a href="/transactions" className="btn btn-xs btn-outline border-success-content/20 hover:bg-success-content/10">
                      {t('viewTransactions')} →
                    </a>
                  )}
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

                  <div className="card-actions justify-end mt-6">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={
                        isPending || 
                        !dateHeader || 
                        !payeeHeader || 
                        (!useSeparateDebitCredit ? !amountHeader : (!debitHeader && !creditHeader))
                      }
                    >
                       {isPending ? t('importing') : t('importButton', { count: totalRowsCount })}
                    </button>
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
