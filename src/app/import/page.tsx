'use client';

import { useState, useEffect, useTransition } from 'react';
import { getAccounts } from '../actions';
import Papa from 'papaparse';

export default function ImportPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvText, setCsvText] = useState('');
  
  // Mapping state
  const [dateHeader, setDateHeader] = useState('');
  const [payeeHeader, setPayeeHeader] = useState('');
  const [amountHeader, setAmountHeader] = useState('');
  const [descHeader, setDescHeader] = useState('');
  const [dateFormatHint, setDateFormatHint] = useState('DD/MM/YYYY');

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

    setFile(selectedFile);
    setImportResult(null);
    setErrorMessage('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);

      // Parse headers using PapaParse
      Papa.parse(text, {
        preview: 1, // Only read first row
        skipEmptyLines: 'greedy',
        complete: (results) => {
          const headers = results.data[0] as string[];
          if (headers && headers.length > 0) {
            const cleanHeaders = headers.map(h => h.trim());
            setCsvHeaders(cleanHeaders);
            
            // Try to auto-detect mappings based on keyword matches
            autoDetectHeaders(cleanHeaders);
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
    // Auto date
    const dateMatch = headers.find((h) => /date/i.test(h));
    if (dateMatch) setDateHeader(dateMatch);

    // Auto payee
    const payeeMatch = headers.find((h) => /payee|merchant|description|narrative/i.test(h));
    if (payeeMatch) setPayeeHeader(payeeMatch);

    // Auto amount
    const amountMatch = headers.find((h) => /amount|debit|credit|value/i.test(h));
    if (amountMatch) setAmountHeader(amountMatch);

    // Auto description
    const descMatch = headers.find((h) => /details|memo|particulars|notes/i.test(h) && h !== payeeMatch);
    if (descMatch) setDescHeader(descMatch);
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId || !csvText || !dateHeader || !payeeHeader || !amountHeader) {
      setErrorMessage('Please complete all required field mappings.');
      return;
    }

    setErrorMessage('');
    setImportResult(null);

    const headerMap = {
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
          // Reset file inputs
          setFile(null);
          setCsvHeaders([]);
          setCsvText('');
          setDateHeader('');
          setPayeeHeader('');
          setAmountHeader('');
          setDescHeader('');
        } else {
          setImportResult({ success: false, message: result.error || 'Failed to import CSV' });
        }
      } catch (err: any) {
        setImportResult({ success: false, message: err.message || 'Connection error' });
      }
    });
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
              {/* Form Row 1: Account selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-bold">Select Target Account</span>
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
                    <span className="label-text font-bold">Choose Statement CSV File</span>
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="file-input file-input-bordered w-full"
                    required
                  />
                </div>
              </div>

              {/* Status and Results */}
              {errorMessage && (
                <div className="alert alert-error text-sm py-3 shadow">
                  <span>❌ {errorMessage}</span>
                </div>
              )}

              {importResult && (
                <div className={`alert ${importResult.success ? 'alert-success' : 'alert-error'} text-sm py-3 shadow`}>
                  <span>{importResult.success ? '✅' : '❌'} {importResult.message}</span>
                </div>
              )}

              {/* Mapper Interface (Shows only when file is parsed) */}
              {csvHeaders.length > 0 && (
                <div className="bg-base-200/50 p-6 rounded-2xl space-y-4 border border-base-300">
                  <h3 className="text-md font-bold uppercase tracking-wider text-primary">
                    Map CSV Columns to Ledger Fields
                  </h3>
                  <p className="text-xs text-base-content/60">
                    Select which column headers in your bank CSV correspond to the core transaction ledger fields.
                  </p>

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
                          <option key={h} value={h}>{h}</option>
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
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-bold">Amount Column *</span>
                      </label>
                      <select
                        value={amountHeader}
                        onChange={(e) => setAmountHeader(e.target.value)}
                        className="select select-bordered w-full select-sm"
                        required
                      >
                        <option value="">-- Select Amount Column --</option>
                        {csvHeaders.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

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
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="card-actions justify-end mt-6">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isPending || !dateHeader || !payeeHeader || !amountHeader}
                    >
                      {isPending ? 'Importing...' : '🚀 Execute Statement Import'}
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
