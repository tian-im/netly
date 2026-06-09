'use client';

import { useState, useEffect, useTransition } from 'react';
import { getAccounts } from '../actions';
import Papa from 'papaparse';
import { cleanAmount, parseBankDate } from '@/lib/csv';

interface Account {
  id: string;
  name: string;
  type: string;
}

interface PreviewTransaction {
  rawDate: string;
  parsedDate: Date | null;
  payee: string;
  amount: number;
  description: string;
}

export default function ImportPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
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

  // Status state
  const [isPending, startTransition] = useTransition();
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Load accounts
    getAccounts().then((data) => {
      setAccounts(data);
      if (data.length > 0) {
        setSelectedAccountId(data[0].id);
      }
    });
  }, []);

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
        setErrorMessage('Invalid file type. Please upload a CSV file.');
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
            setErrorMessage('Empty or invalid CSV file.');
          }
        },
        error: (err: any) => {
          setErrorMessage(`Failed to read CSV headers: ${err.message}`);
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

  const getPreviewTransactions = (): PreviewTransaction[] => {
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
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAccountId || !csvText || !dateHeader || !payeeHeader) {
      setErrorMessage('Please complete all required field mappings.');
      return;
    }
    
    if (!useSeparateDebitCredit && !amountHeader) {
      setErrorMessage('Please select the Amount column.');
      return;
    }
    
    if (useSeparateDebitCredit && !debitHeader && !creditHeader) {
      setErrorMessage('Please select at least a Debit or Credit column.');
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
          setImportResult({ success: true, message: result.message });
          // Reset file inputs but preserve mapping selections
          setFile(null);
          setCsvHeaders([]);
          setCsvText('');
          setCsvRows([]);
          setTotalRowsCount(0);
        } else {
          setImportResult({ success: false, message: result.error || 'Failed to import CSV' });
        }
      } catch (err: any) {
        setImportResult({ success: false, message: err.message || 'Connection error' });
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
          Import Bank Statement
        </h1>
        <p className="text-base-content/60 text-sm mt-1">
          Upload any bank CSV file, map the columns, and automatically load the transactions.
        </p>
      </div>

      <div className="card bg-base-100 shadow-xl border border-base-200">
        <div className="card-body">
          {accounts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-base-content/60">No accounts exist yet. Please create an account on the Accounts page first.</p>
              <a href="/accounts" className="btn btn-primary mt-4 btn-sm">Go to Accounts</a>
            </div>
          ) : (
            <form onSubmit={handleImport} className="space-y-6">
              {/* Form Row 1: Account selection & File drag-and-drop */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-bold text-base-content/80">Select Target Account</span>
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
                    <span className="label-text font-bold text-base-content/80">Choose or Drag Statement CSV File</span>
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
                          <span className="text-3xl">📄</span>
                        ) : (
                          <span className="text-3xl text-base-content/30">📥</span>
                        )}
                      </div>
                      <div className="text-sm font-medium">
                        {file ? (
                          <span className="text-success font-semibold">{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                        ) : (
                          <span>Click to browse or drag & drop CSV file here</span>
                        )}
                      </div>
                      <p className="text-xs text-base-content/40">Only CSV format supported</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status and Results */}
              {errorMessage && (
                <div className="alert alert-error text-sm py-3 shadow">
                  <span>❌ {errorMessage}</span>
                </div>
              )}

              {importResult && (
                <div className={`alert ${importResult.success ? 'alert-success' : 'alert-error'} text-sm py-3 shadow flex justify-between items-center`}>
                  <div className="flex items-center gap-2">
                    <span>{importResult.success ? '✅' : '❌'}</span>
                    <span>{importResult.message}</span>
                  </div>
                  {importResult.success && (
                    <a href="/transactions" className="btn btn-xs btn-outline border-success-content/20 hover:bg-success-content/10">
                      View Transactions →
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
                        Map CSV Columns to Ledger Fields
                      </h3>
                      <p className="text-xs text-base-content/60 mt-0.5">
                        Select which column headers in your CSV correspond to the transaction fields.
                      </p>
                    </div>
                    
                    <div className="text-xs text-base-content/75 font-semibold bg-base-300/60 px-3 py-1.5 rounded-lg border border-base-300">
                      📊 Detected {totalRowsCount} rows in CSV
                    </div>
                  </div>

                  {/* Toggle between Single and Separate Amount Columns */}
                  <div className="form-control w-fit bg-base-100 p-2.5 rounded-xl border border-base-200 shadow-sm">
                    <span className="label-text font-bold mb-1.5 block">Amount Mapping Type</span>
                    <div className="flex gap-4">
                      <label className="label cursor-pointer gap-2 py-0">
                        <input
                          type="radio"
                          name="amountType"
                          className="radio radio-primary radio-sm"
                          checked={!useSeparateDebitCredit}
                          onChange={() => setUseSeparateDebitCredit(false)}
                        />
                        <span className="label-text text-xs">Single Amount Column</span>
                      </label>
                      <label className="label cursor-pointer gap-2 py-0">
                        <input
                          type="radio"
                          name="amountType"
                          className="radio radio-primary radio-sm"
                          checked={useSeparateDebitCredit}
                          onChange={() => setUseSeparateDebitCredit(true)}
                        />
                        <span className="label-text text-xs">Separate Debit & Credit Columns</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-bold">Date Column *</span>
                      </label>
                      <select
                        value={dateHeader}
                        onChange={(e) => setDateHeader(e.target.value)}
                        className="select select-bordered w-full select-sm"
                        required
                      >
                        <option value="">-- Select Date Column --</option>
                        {csvHeaders.map((h) => (
                          <option key={h} value={h}>{renderDropdownOptionText(h)}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-bold">Date Layout Format</span>
                      </label>
                      <select
                        value={dateFormatHint}
                        onChange={(e) => setDateFormatHint(e.target.value)}
                        className="select select-bordered w-full select-sm"
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY (Day/Month/Year)</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY (Month/Day/Year)</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD (ISO Format)</option>
                      </select>
                    </div>

                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-bold">Payee / Merchant Column *</span>
                      </label>
                      <select
                        value={payeeHeader}
                        onChange={(e) => setPayeeHeader(e.target.value)}
                        className="select select-bordered w-full select-sm"
                        required
                      >
                        <option value="">-- Select Payee Column --</option>
                        {csvHeaders.map((h) => (
                          <option key={h} value={h}>{renderDropdownOptionText(h)}</option>
                        ))}
                      </select>
                    </div>

                    {/* Conditional Amount/Debit/Credit Fields */}
                    {!useSeparateDebitCredit ? (
                      <div className="form-control w-full">
                        <label className="label">
                          <span className="label-text font-bold">Amount Column *</span>
                        </label>
                        <select
                          value={amountHeader}
                          onChange={(e) => setAmountHeader(e.target.value)}
                          className="select select-bordered w-full select-sm"
                          required={!useSeparateDebitCredit}
                        >
                          <option value="">-- Select Amount Column --</option>
                          {csvHeaders.map((h) => (
                            <option key={h} value={h}>{renderDropdownOptionText(h)}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <>
                        <div className="form-control w-full">
                          <label className="label">
                            <span className="label-text font-bold">Debit Column (Outflows)</span>
                          </label>
                          <select
                            value={debitHeader}
                            onChange={(e) => setDebitHeader(e.target.value)}
                            className="select select-bordered w-full select-sm"
                          >
                            <option value="">-- Select Debit Column --</option>
                            {csvHeaders.map((h) => (
                              <option key={h} value={h}>{renderDropdownOptionText(h)}</option>
                            ))}
                          </select>
                        </div>

                        <div className="form-control w-full">
                          <label className="label">
                            <span className="label-text font-bold">Credit Column (Inflows)</span>
                          </label>
                          <select
                            value={creditHeader}
                            onChange={(e) => setCreditHeader(e.target.value)}
                            className="select select-bordered w-full select-sm"
                          >
                            <option value="">-- Select Credit Column --</option>
                            {csvHeaders.map((h) => (
                              <option key={h} value={h}>{renderDropdownOptionText(h)}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-bold">Description Column (Optional)</span>
                      </label>
                      <select
                        value={descHeader}
                        onChange={(e) => setDescHeader(e.target.value)}
                        className="select select-bordered w-full select-sm"
                      >
                        <option value="">-- None --</option>
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
                          Data Preview (First 5 Rows)
                        </span>
                        <span className="text-[10px] text-base-content/50 font-semibold bg-base-300 px-2 py-0.5 rounded">
                          Parsed Live
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="table table-xs w-full">
                          <thead>
                            <tr className="bg-base-200/20 text-base-content/60">
                              <th>Date</th>
                              <th>Payee</th>
                              <th className="text-right">Amount</th>
                              <th>Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getPreviewTransactions().map((t, idx) => (
                              <tr key={idx} className="hover border-b border-base-200/50">
                                <td className="whitespace-nowrap">
                                  {t.parsedDate ? (
                                    <span className="text-success font-medium">
                                      {t.parsedDate.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' })}
                                    </span>
                                  ) : (
                                    <span className="text-error italic" title="Date parsing failed - check layout format">
                                      ⚠️ {t.rawDate || 'Empty'}
                                    </span>
                                  )}
                                </td>
                                <td className="max-w-[200px] truncate font-medium">
                                  {t.payee || <span className="text-base-content/30 italic">None</span>}
                                </td>
                                <td className={`text-right font-mono font-bold ${t.amount < 0 ? 'text-error' : 'text-success'}`}>
                                  {!isNaN(t.amount) ? (
                                    <>
                                      {t.amount < 0 ? '-' : '+'}
                                      ${Math.abs(t.amount).toFixed(2)}
                                    </>
                                  ) : (
                                    <span className="text-error italic">Invalid</span>
                                  )}
                                </td>
                                <td className="max-w-[250px] truncate text-base-content/70">
                                  {t.description || <span className="text-base-content/20 italic">Empty</span>}
                                </td>
                              </tr>
                            ))}
                            {getPreviewTransactions().length === 0 && (
                              <tr>
                                <td colSpan={4} className="text-center py-4 text-base-content/40 italic">
                                  Failed to map preview transactions. Check selected columns.
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
                      {isPending ? 'Importing...' : 'Execute Statement Import'}
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
