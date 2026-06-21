import { useState, useRef } from 'react';
import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { exportAllTransactions, exportAllAccounts, importAccounts, getAccounts } from '@/app/actions';
import { formatDateISO } from '@/lib/dates';
import { Button, Card, Modal } from '@/app/components/ui';
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from '@/lib/currencies';
import { validateAccountImport, isAccountDuplicate } from '@/lib/import-utils';
import { translateError } from '@/lib/translateError';
import Papa from 'papaparse';

interface ExportCardProps {
  accountsCount: number;
  transactionsCount: number;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

interface ParsedAccount {
  id?: string;
  name: string;
  type: 'ASSET' | 'LIABILITY';
  startingBalance: number;
  currency: string;
  createdAt?: string;
  status: 'new' | 'duplicate' | 'invalid';
}

const findHeader = (headers: string[], possibleNames: string[]): string | undefined => {
  // 1. Try exact case-insensitive match first (trimmed)
  const cleanPossible = possibleNames.map((p) => p.trim().toLowerCase());
  const exactMatch = headers.find((h) => cleanPossible.includes(h.trim().toLowerCase()));
  if (exactMatch) return exactMatch;

  // 2. Fallback to normalized match (stripping spaces and underscores)
  const normalizedPossible = cleanPossible.map((p) => p.replace(/[\s_]/g, ''));
  return headers.find((h) => normalizedPossible.includes(h.trim().toLowerCase().replace(/[\s_]/g, '')));
};

export default function ExportCard({ accountsCount, transactionsCount, showToast }: ExportCardProps) {
  const t = useTranslations('settings');
  const tAccounts = useTranslations('accounts');
  const tCommon = useTranslations('common');
  const tErr = useTranslations('errors');
  const [isExportingTransactions, setIsExportingTransactions] = useState(false);
  const [isExportingAccounts, setIsExportingAccounts] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [parsedAccounts, setParsedAccounts] = useState<ParsedAccount[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportTransactions = async () => {
    setIsExportingTransactions(true);
    try {
      const txs = await exportAllTransactions();
      const { generateLedgerCSV, downloadCSV } = await import('@/lib/csv-export');
      const csvContent = generateLedgerCSV(txs);
      downloadCSV(csvContent, `netly_transactions_${formatDateISO()}.csv`);
      showToast(t('exportSuccess'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg || t('exportFailed'), 'error');
    } finally {
      setIsExportingTransactions(false);
    }
  };

  const handleExportAccounts = async () => {
    setIsExportingAccounts(true);
    try {
      const accs = await exportAllAccounts();
      const { generateAccountCSV, downloadCSV } = await import('@/lib/csv-export');
      const csvContent = generateAccountCSV(accs);
      downloadCSV(csvContent, `netly_accounts_${formatDateISO()}.csv`);
      showToast(t('exportSuccess'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg || t('exportFailed'), 'error');
    } finally {
      setIsExportingAccounts(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // File size guard: 5MB limit
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      showToast(t('importAccountsFileTooLarge'), 'error');
      return;
    }

    setIsParsing(true);
    // Reset input value so same file can be uploaded again
    e.target.value = '';

    const reader = new FileReader();
    reader.onerror = () => {
      showToast(t('importAccountsFailed'), 'error');
      setIsParsing(false);
    };
    reader.onload = async (event) => {
      const text = event.target?.result;
      if (typeof text !== 'string') {
        setIsParsing(false);
        return;
      }

      Papa.parse(text, {
        header: true,
        skipEmptyLines: 'greedy',
        complete: async (results) => {
          if (results.errors.length > 0) {
            console.warn('PapaParse warnings/errors encountered:', results.errors);
            if (results.data.length === 0) {
              showToast(t('importAccountsInvalidFile'), 'error');
              setIsParsing(false);
              return;
            }
            showToast(t('importAccountsWarning'), 'warning');
          }

          const data = results.data as Array<Record<string, string>>;
          if (data.length === 0) {
            showToast(t('importAccountsInvalidFile'), 'error');
            setIsParsing(false);
            return;
          }

          const headers = Object.keys(data[0] || {});
          const nameHeader = findHeader(headers, ['name', 'accountname']);
          const typeHeader = findHeader(headers, ['type', 'accounttype']);
          const idHeader = findHeader(headers, ['id', 'accountid']);
          const balanceHeader = findHeader(headers, ['startingbalance', 'balance', 'starting_balance']);
          const currencyHeader = findHeader(headers, ['currency']);
          const dateHeader = findHeader(headers, ['createdat', 'date', 'created_at']);

          if (!nameHeader || !typeHeader) {
            showToast(t('importAccountsInvalidFile'), 'error');
            setIsParsing(false);
            return;
          }

          try {
            const existing = await getAccounts();
            const dbNames = new Set(existing.map((a) => a.name.trim().toLowerCase()));
            const dbIds = new Set(existing.map((a) => a.id));

            const batchNames = new Set<string>();
            const batchIds = new Set<string>();

            const parsed: ParsedAccount[] = [];

            for (const row of data) {
              const nameVal = String(row[nameHeader] || '').trim();
              const typeVal = String(row[typeHeader] || '').trim();
              const currencyVal = String(currencyHeader ? row[currencyHeader] : '').trim();
              const idVal = idHeader ? String(row[idHeader] || '').trim() : undefined;
              const balanceStr = balanceHeader ? String(row[balanceHeader]) : '0';
              const createdAt = dateHeader ? String(row[dateHeader] || '').trim() : undefined;

              // Skip completely blank rows
              const isEmptyRow = !nameVal && !typeVal && !currencyVal && !idVal;
              if (isEmptyRow) continue;

              const validation = validateAccountImport(
                { name: nameVal, type: typeVal, currency: currencyVal, id: idVal },
                SUPPORTED_CURRENCIES
              );

              let status: 'new' | 'duplicate' | 'invalid' = 'new';
              const name = nameVal;
              const type: 'ASSET' | 'LIABILITY' = typeVal.toUpperCase() === 'LIABILITY' ? 'LIABILITY' : 'ASSET';
              const currency = currencyVal.toUpperCase() || DEFAULT_CURRENCY;
              const startingBalance = parseFloat(balanceStr) || 0;
              const validId = idVal && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idVal)
                ? idVal.toLowerCase()
                : undefined;

              if (!validation.isValid) {
                status = 'invalid';
              } else {
                const dupCheck = isAccountDuplicate(
                  { id: validId, name },
                  dbIds,
                  dbNames,
                  batchIds,
                  batchNames
                );

                if (dupCheck.isDuplicate) {
                  status = 'duplicate';
                } else {
                  status = 'new';
                  batchNames.add(name.toLowerCase());
                  if (validId) {
                    batchIds.add(validId);
                  }
                }
              }

              parsed.push({
                id: validId,
                name,
                type,
                startingBalance,
                currency,
                createdAt,
                status,
              });
            }

            if (parsed.length === 0) {
              showToast(t('importAccountsInvalidFile'), 'error');
              setIsParsing(false);
              return;
            }

            setParsedAccounts(parsed);
            setIsModalOpen(true);
          } catch (err) {
            showToast(t('importAccountsFailed'), 'error');
          } finally {
            setIsParsing(false);
          }
        },
      });
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    const toImport = parsedAccounts.filter((a) => a.status === 'new');
    if (toImport.length === 0) {
      setIsModalOpen(false);
      return;
    }

    setIsImporting(true);
    try {
      const res = await importAccounts(toImport);
      const skippedCount = parsedAccounts.length - res.importedCount;
      showToast(
        t('importAccountsSuccess', {
          importedCount: res.importedCount,
          skippedCount,
        })
      );
      setIsModalOpen(false);
    } catch (err: unknown) {
      showToast(tErr(translateError(err)), 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <Card>
        <Card.Body>
          <Card.Title icon={<Download className="h-5 w-5 text-primary" />}>
            {t('exportTitle')}
          </Card.Title>
          <p className="text-xs text-base-content/60">{t('exportDesc')}</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <Button
              onClick={handleExportTransactions}
              size="md"
              disabled={transactionsCount === 0}
              loading={isExportingTransactions}
              icon={<FileSpreadsheet className="h-5 w-5" />}
              aria-label={t('exportTransactionsBtn')}
            >
              {t('exportTransactionsBtn')}
            </Button>

            <Button
              onClick={handleExportAccounts}
              size="md"
              disabled={accountsCount === 0}
              loading={isExportingAccounts}
              icon={<FileSpreadsheet className="h-5 w-5" />}
              aria-label={t('exportAccountsBtn')}
            >
              {t('exportAccountsBtn')}
            </Button>

            <Button
              onClick={handleImportClick}
              size="md"
              loading={isParsing}
              icon={<Upload className="h-5 w-5" />}
              aria-label={t('importAccountsBtn')}
            >
              {t('importAccountsBtn')}
            </Button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".csv"
            onChange={handleFileChange}
          />
        </Card.Body>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="2xl">
        <Modal.Header onClose={() => setIsModalOpen(false)}>
          <Modal.Title icon={<Upload className="h-5 w-5 text-primary" />}>
            {t('importAccountsModalTitle')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-xs text-base-content/70 mb-4">{t('importAccountsModalDesc')}</p>

          <div className="overflow-x-auto border border-base-200 rounded-lg max-h-[300px] mt-2">
            <table className="table table-xs w-full">
              <thead>
                <tr className="bg-base-200/50">
                  <th className="p-2">{t('tableHeaderName')}</th>
                  <th className="p-2">{t('tableHeaderType')}</th>
                  <th className="p-2">{t('tableHeaderCurrency')}</th>
                  <th className="p-2 text-right">{t('tableHeaderBalance')}</th>
                  <th className="p-2 text-center">{t('tableHeaderStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {parsedAccounts.map((acc, idx) => (
                  <tr key={idx} className="hover:bg-base-200/10 border-b border-base-200/50">
                    <td className="p-2 font-semibold max-w-[150px] truncate" title={acc.name}>
                      {acc.name || <span className="italic text-base-content/30">N/A</span>}
                    </td>
                    <td className="p-2">
                      <span
                        className={`badge ${
                          acc.type === 'ASSET' ? 'badge-primary' : 'badge-secondary'
                        } badge-xs font-semibold`}
                      >
                        {acc.type === 'ASSET'
                          ? tAccounts('accountTypeAsset')
                          : tAccounts('accountTypeLiability')}
                      </span>
                    </td>
                    <td className="p-2">
                      <span className="badge badge-xs badge-ghost font-mono font-bold">
                        {acc.currency}
                      </span>
                    </td>
                    <td className="p-2 font-mono text-right">
                      {acc.startingBalance.toFixed(2)}
                    </td>
                    <td className="p-2 text-center">
                      {acc.status === 'new' && (
                        <span className="badge badge-success text-success-content badge-xs font-semibold">
                          {t('statusNew')}
                        </span>
                      )}
                      {acc.status === 'duplicate' && (
                        <span className="badge badge-neutral text-neutral-content badge-xs font-semibold">
                          {t('statusExists')}
                        </span>
                      )}
                      {acc.status === 'invalid' && (
                        <span className="badge badge-error text-error-content badge-xs font-semibold">
                          {t('statusInvalid')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal.Body>
        <Modal.Actions>
          <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isImporting}>
            {tCommon('cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmImport}
            loading={isImporting}
            disabled={isImporting || parsedAccounts.filter((a) => a.status === 'new').length === 0}
          >
            {isImporting ? t('importAccountsProgress') : t('importAccountsConfirmBtn')}
          </Button>
        </Modal.Actions>
      </Modal>
    </>
  );
}
