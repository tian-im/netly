'use client';

import { useState, useEffect, useTransition } from 'react';
import { getFinancialReports, getTransactions } from '../actions';

export default function ReportsPage() {
  const now = new Date();
  
  // Date range state (Defaults to year-to-date)
  const defaultStartStr = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
  const defaultEndStr = now.toISOString().split('T')[0];

  const [startDateStr, setStartDateStr] = useState(defaultStartStr);
  const [endDateStr, setEndDateStr] = useState(defaultEndStr);
  
  // Compiled report state
  const [reports, setReports] = useState<any | null>(null);
  const [selectedReportCurrency, setSelectedReportCurrency] = useState('AUD');
  const [isPending, startTransition] = useTransition();

  const loadReports = () => {
    startTransition(async () => {
      try {
        const data = await getFinancialReports(startDateStr, endDateStr);
        setReports(data);
      } catch (err: any) {
        alert(err.message || 'Failed to compile financial reports');
      }
    });
  };

  useEffect(() => {
    loadReports();
  }, []);

  // Compute available currencies in reports
  const reportCurrencies = reports ? Array.from(new Set([
    ...Object.keys(reports.balanceSheet.totals),
    ...Object.keys(reports.incomeStatement.totals),
    ...Object.keys(reports.cashFlowStatement.totals)
  ])) : ['AUD'];

  // Update selected currency if needed when reports load
  useEffect(() => {
    if (reports && reportCurrencies.length > 0 && !reportCurrencies.includes(selectedReportCurrency)) {
      setSelectedReportCurrency(reportCurrencies[0]);
    }
  }, [reports]);

  // Extract selected currency totals
  const bsTotals = reports?.balanceSheet?.totals?.[selectedReportCurrency] || { totalAssets: 0, totalLiabilities: 0, netWorth: 0 };
  const bsAccounts = reports?.balanceSheet?.accounts?.filter((a: any) => (a.currency || 'AUD') === selectedReportCurrency) || [];

  const isTotals = reports?.incomeStatement?.totals?.[selectedReportCurrency] || { income: [], expenses: [], totalIncome: 0, totalExpenses: 0, netIncome: 0 };
  const cfTotals = reports?.cashFlowStatement?.totals?.[selectedReportCurrency] || {
    operating: { inflow: 0, outflow: 0, net: 0 },
    investing: { inflow: 0, outflow: 0, net: 0 },
    financing: { inflow: 0, outflow: 0, net: 0 },
    netCashFlow: 0
  };

  const handleExportCSV = async () => {
    try {
      const { transactions: txs } = await getTransactions();
      if (txs.length === 0) {
        alert('No transactions to export.');
        return;
      }

      // Compile headers
      const csvRows = ['Date,Account,Currency,Payee,Category,Type,Amount,Description'];
      
      for (const tx of txs) {
        const dateStr = new Date(tx.date).toISOString().split('T')[0];
        const categoryName = tx.category ? tx.category.name : 'Uncategorized';
        const categoryType = tx.category ? tx.category.type : 'N/A';
        const cleanDesc = tx.description ? tx.description.replace(/"/g, '""') : '';
        const cleanPayee = tx.payee.replace(/"/g, '""');

        csvRows.push(
          `"${dateStr}","${tx.account.name}","${tx.account.currency}","${cleanPayee}","${categoryName}","${categoryType}",${tx.amount},"${cleanDesc}"`
        );
      }

      const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `financial_ledger_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert('Failed to export CSV: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-base-content">
            Financial Statements
          </h1>
          <p className="text-base-content/60 text-sm mt-1">
            Analyze your balance sheet, income/expense distributions, and cash flow sections.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="btn btn-outline btn-primary btn-sm gap-2"
          disabled={isPending}
        >
          📤 Export Full Ledger CSV
        </button>
      </div>

      {/* Date Filters card */}
      <div className="card bg-base-100 shadow border border-base-200">
        <div className="card-body p-5 flex flex-col md:flex-row items-end gap-4 justify-between">
          <div className="flex flex-col md:flex-row gap-4 flex-1 w-full">
            <div className="form-control flex-1">
              <label className="label">
                <span className="label-text font-bold">Start Date</span>
              </label>
              <input
                type="date"
                value={startDateStr}
                onChange={(e) => setStartDateStr(e.target.value)}
                className="input input-bordered input-sm"
              />
            </div>
            <div className="form-control flex-1">
              <label className="label">
                <span className="label-text font-bold">End Date</span>
              </label>
              <input
                type="date"
                value={endDateStr}
                onChange={(e) => setEndDateStr(e.target.value)}
                className="input input-bordered input-sm"
              />
            </div>
          </div>
          <button
            onClick={loadReports}
            className="btn btn-primary btn-sm w-full md:w-auto"
            disabled={isPending}
          >
            {isPending ? 'Compiling...' : '🔄 Compile Statements'}
          </button>
        </div>
      </div>

      {/* Currency tab selector */}
      {reports && reportCurrencies.length > 1 && (
        <div className="flex items-center gap-2 bg-base-100 p-4 rounded-xl shadow border border-base-200 justify-center sm:justify-start">
          <span className="font-bold text-sm text-base-content/70">View Statement Currency:</span>
          <div className="join">
            {reportCurrencies.map((cur) => (
              <button
                key={cur}
                onClick={() => setSelectedReportCurrency(cur)}
                className={`btn btn-sm join-item ${selectedReportCurrency === cur ? 'btn-primary' : 'btn-outline'}`}
              >
                {cur}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Statements Accordions */}
      {reports && (
        <div className="space-y-4">
          
          {/* 1. Balance Sheet */}
          <div className="collapse collapse-arrow bg-base-100 shadow border border-base-200">
            <input type="radio" name="reports-accordion" defaultChecked /> 
            <div className="collapse-title text-lg font-bold flex justify-between items-center pr-12 text-primary">
              <span>⚖️ Balance Sheet ({selectedReportCurrency})</span>
              <span className="text-sm font-semibold opacity-60">
                Net Worth: ${bsTotals.netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="collapse-content px-6 pb-6">
              <div className="divider my-0"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                {/* Assets Table */}
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-primary border-b border-primary/20 pb-2 mb-3">
                    Assets (Checking, Savings, Cash)
                  </h3>
                  <div className="space-y-2">
                    {bsAccounts.filter((a: any) => a.type === 'ASSET').length === 0 ? (
                      <div className="text-xs text-base-content/40 py-2">No assets in {selectedReportCurrency}.</div>
                    ) : (
                      bsAccounts.filter((a: any) => a.type === 'ASSET').map((acc: any) => (
                        <div key={acc.id} className="flex justify-between items-center text-sm">
                          <span>{acc.name}</span>
                          <span className="font-mono font-semibold text-success">${acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))
                    )}
                    <div className="flex justify-between items-center font-bold text-sm border-t border-base-300 pt-2 mt-2">
                      <span>Total Assets</span>
                      <span className="text-success">${bsTotals.totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Liabilities Table */}
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-secondary border-b border-secondary/20 pb-2 mb-3">
                    Liabilities (Debt, Cards, Loans)
                  </h3>
                  <div className="space-y-2">
                    {bsAccounts.filter((a: any) => a.type === 'LIABILITY').length === 0 ? (
                      <div className="text-xs text-base-content/40 py-2">No liabilities in {selectedReportCurrency}.</div>
                    ) : (
                      bsAccounts.filter((a: any) => a.type === 'LIABILITY').map((acc: any) => (
                        <div key={acc.id} className="flex justify-between items-center text-sm">
                          <span>{acc.name}</span>
                          <span className="font-mono font-semibold text-error">${(-acc.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))
                    )}
                    <div className="flex justify-between items-center font-bold text-sm border-t border-base-300 pt-2 mt-2">
                      <span>Total Liabilities</span>
                      <span className="text-error">${bsTotals.totalLiabilities.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-base-200/50 p-4 rounded-xl flex justify-between items-center mt-6 border border-base-300">
                <span className="font-extrabold text-md">NET WORTH (Equity)</span>
                <span className={`font-mono font-extrabold text-xl ${bsTotals.netWorth >= 0 ? 'text-success' : 'text-error'}`}>
                  ${bsTotals.netWorth.toLocaleString(undefined, { minimumFractionDigits: 2 })} {selectedReportCurrency}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Income Statement */}
          <div className="collapse collapse-arrow bg-base-100 shadow border border-base-200">
            <input type="radio" name="reports-accordion" /> 
            <div className="collapse-title text-lg font-bold flex justify-between items-center pr-12 text-primary">
              <span>🧾 Income & Expense Statement ({selectedReportCurrency})</span>
              <span className="text-sm font-semibold opacity-60">
                Net Income: ${isTotals.netIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="collapse-content px-6 pb-6">
              <div className="divider my-0"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                {/* Income Section */}
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-success border-b border-success/20 pb-2 mb-3">
                    Revenue & Inflows
                  </h3>
                  <div className="space-y-2">
                    {isTotals.income.length === 0 ? (
                      <div className="text-xs text-base-content/40 py-2">No income recorded in range.</div>
                    ) : (
                      isTotals.income.map((inc: any) => (
                        <div key={inc.name} className="flex justify-between items-center text-sm">
                          <span>{inc.name}</span>
                          <span className="font-mono font-semibold text-success">${inc.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))
                    )}
                    <div className="flex justify-between items-center font-bold text-sm border-t border-base-300 pt-2 mt-2">
                      <span>Total Revenue</span>
                      <span className="text-success">${isTotals.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Expenses Section */}
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-error border-b border-error/20 pb-2 mb-3">
                    Expenses & Outflows
                  </h3>
                  <div className="space-y-2">
                    {isTotals.expenses.length === 0 ? (
                      <div className="text-xs text-base-content/40 py-2">No expenses recorded in range.</div>
                    ) : (
                      isTotals.expenses.map((exp: any) => (
                        <div key={exp.name} className="flex justify-between items-center text-sm">
                          <span>{exp.name}</span>
                          <span className="font-mono font-semibold text-error">${exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))
                    )}
                    <div className="flex justify-between items-center font-bold text-sm border-t border-base-300 pt-2 mt-2">
                      <span>Total Expenses</span>
                      <span className="text-error">${isTotals.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-base-200/50 p-4 rounded-xl flex justify-between items-center mt-6 border border-base-300">
                <span className="font-extrabold text-md">NET INCOME</span>
                <span className={`font-mono font-extrabold text-xl ${isTotals.netIncome >= 0 ? 'text-success' : 'text-error'}`}>
                  ${isTotals.netIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })} {selectedReportCurrency}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Cash Flow Statement */}
          <div className="collapse collapse-arrow bg-base-100 shadow border border-base-200">
            <input type="radio" name="reports-accordion" /> 
            <div className="collapse-title text-lg font-bold flex justify-between items-center pr-12 text-primary">
              <span>💸 Cash Flow Statement ({selectedReportCurrency})</span>
              <span className="text-sm font-semibold opacity-60">
                Net Cash Flow: ${cfTotals.netCashFlow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="collapse-content px-6 pb-6">
              <div className="divider my-0"></div>
              
              <div className="space-y-6 mt-4">
                {/* 3.1 Operating Cash Flows */}
                <div className="bg-base-200/40 p-4 rounded-xl border border-base-300/40">
                  <div className="flex justify-between items-center font-bold text-sm border-b border-base-300 pb-2 mb-2">
                    <span>1. Cash Flows from Operating Activities</span>
                    <span className={cfTotals.operating.net >= 0 ? 'text-success' : 'text-error'}>
                      ${cfTotals.operating.net.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs px-2 text-base-content/75">
                    <div className="flex justify-between">
                      <span>Operating Inflow (Salary, Revenue)</span>
                      <span className="text-success font-semibold">${cfTotals.operating.inflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Operating Outflow (Groceries, Rent, Utilities)</span>
                      <span className="text-error font-semibold">-${cfTotals.operating.outflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* 3.2 Investing Cash Flows */}
                <div className="bg-base-200/40 p-4 rounded-xl border border-base-300/40">
                  <div className="flex justify-between items-center font-bold text-sm border-b border-base-300 pb-2 mb-2">
                    <span>2. Cash Flows from Investing Activities</span>
                    <span className={cfTotals.investing.net >= 0 ? 'text-success' : 'text-error'}>
                      ${cfTotals.investing.net.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs px-2 text-base-content/75">
                    <div className="flex justify-between">
                      <span>Investing Inflows (Capital Sales)</span>
                      <span className="text-success font-semibold">${cfTotals.investing.inflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Investing Outflows (Stock Buy, Assets Purchase)</span>
                      <span className="text-error font-semibold">-${cfTotals.investing.outflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* 3.3 Financing Cash Flows */}
                <div className="bg-base-200/40 p-4 rounded-xl border border-base-300/40">
                  <div className="flex justify-between items-center font-bold text-sm border-b border-base-300 pb-2 mb-2">
                    <span>3. Cash Flows from Financing Activities</span>
                    <span className={cfTotals.financing.net >= 0 ? 'text-success' : 'text-error'}>
                      ${cfTotals.financing.net.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs px-2 text-base-content/75">
                    <div className="flex justify-between">
                      <span>Financing Inflows (Debt Drawdowns)</span>
                      <span className="text-success font-semibold">${cfTotals.financing.inflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Financing Outflows (Debt Paydowns, Loan Principal)</span>
                      <span className="text-error font-semibold">-${cfTotals.financing.outflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-base-200/50 p-4 rounded-xl flex justify-between items-center mt-6 border border-base-300">
                <span className="font-extrabold text-md">NET CASH INCREASE / DECREASE</span>
                <span className={`font-mono font-extrabold text-xl ${cfTotals.netCashFlow >= 0 ? 'text-success' : 'text-error'}`}>
                  ${cfTotals.netCashFlow.toLocaleString(undefined, { minimumFractionDigits: 2 })} {selectedReportCurrency}
                </span>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
