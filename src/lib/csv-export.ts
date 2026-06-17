import { Transaction } from '@/app/transactions/types';
import { formatDateISO } from '@/lib/dates';

/**
 * Converts a list of transactions to a CSV string.
 */
export function generateLedgerCSV(transactions: Transaction[]): string {
  const csvRows = ['Date,Account,Currency,Payee,Category,Type,Amount,Description'];
  
  for (const tx of transactions) {
    const dateStr = formatDateISO(tx.date);
    const categoryName = tx.category ? tx.category.name : 'Uncategorized';
    const categoryType = tx.category ? tx.category.type : 'N/A';
    const cleanDesc = tx.description ? tx.description.replace(/"/g, '""') : '';
    const cleanPayee = tx.payee.replace(/"/g, '""');

    csvRows.push(
      `"${dateStr}","${tx.account.name}","${tx.account.currency}","${cleanPayee}","${categoryName}","${categoryType}",${tx.amount},"${cleanDesc}"`
    );
  }

  return csvRows.join('\n');
}

/**
 * Converts a list of accounts to a CSV string.
 */
export function generateAccountCSV(accounts: any[]): string {
  const csvRows = ['ID,Name,Type,Starting Balance,Currency,Created At'];
  for (const acc of accounts) {
    const cleanName = acc.name.replace(/"/g, '""');
    const dateStr = acc.createdAt ? formatDateISO(acc.createdAt) : '';
    csvRows.push(`"${acc.id}","${cleanName}","${acc.type}",${acc.startingBalance},"${acc.currency}","${dateStr}"`);
  }
  return csvRows.join('\n');
}

/**
 * Triggers a browser download of the CSV content.
 */
export function downloadCSV(csvContent: string, fileName: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
