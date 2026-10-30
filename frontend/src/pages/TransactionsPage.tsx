import React, { useState, useEffect } from 'react';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';
import { financialService } from '../services/financialService';
import { Transaction, TransactionType } from '../types';
import { Card, PageHeader, StatusBadge, EmptyState } from '../components/common';

export const TransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filtered, setFiltered] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'ALL' | TransactionType>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await financialService.getTransactions();
      setTransactions(data);
      setFiltered(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load transactions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let result = [...transactions];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        t => t.description.toLowerCase().includes(q) || 
             t.counterparty.toLowerCase().includes(q) ||
             t.id.toLowerCase().includes(q)
      );
    }

    if (selectedType !== 'ALL') {
      result = result.filter(t => t.type === selectedType);
    }

    if (selectedCategory !== 'ALL') {
      result = result.filter(t => t.category === selectedCategory);
    }

    setFiltered(result);
    setCurrentPage(1);
  }, [searchTerm, selectedType, selectedCategory, transactions]);

  const categories = Array.from(new Set(transactions.map(t => t.category))).filter(Boolean);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedTransactions = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Total sums of filtered transactions
  const totalCredits = filtered
    .filter(t => t.type === 'CREDIT')
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const totalDebits = filtered
    .filter(t => t.type === 'DEBIT')
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Statement Transactions"
        description="Unified financial ledger parsed from verified bank statements and UPI payment history."
        badge={`${filtered.length} Records`}
      />

      {/* Ledger Metrics Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="sm" className="bg-white">
          <span className="text-[11px] font-bold text-[#687080] uppercase tracking-wider block">Total Filtered Inflow</span>
          <span className="text-xl font-bold font-mono-num text-[#16865C] mt-1 block">
            + ₹{totalCredits.toLocaleString('en-IN')}
          </span>
        </Card>
        <Card padding="sm" className="bg-white">
          <span className="text-[11px] font-bold text-[#687080] uppercase tracking-wider block">Total Filtered Outflow</span>
          <span className="text-xl font-bold font-mono-num text-[#171B26] mt-1 block">
            - ₹{totalDebits.toLocaleString('en-IN')}
          </span>
        </Card>
        <Card padding="sm" className="bg-white">
          <span className="text-[11px] font-bold text-[#687080] uppercase tracking-wider block">Net Cash Flow</span>
          <span className={`text-xl font-bold font-mono-num mt-1 block ${totalCredits - totalDebits >= 0 ? 'text-[#16865C]' : 'text-[#D94B4B]'}`}>
            {totalCredits - totalDebits >= 0 ? '+' : '-'} ₹{Math.abs(totalCredits - totalDebits).toLocaleString('en-IN')}
          </span>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card padding="sm" className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3 bg-white">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-2.5 text-[#9299A5]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search description, counterparty, or transaction ID..."
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-[#E5E7EB] bg-white text-[#171B26] placeholder:text-[#9299A5] focus:outline-none focus:ring-2 focus:ring-[#F28C28]/20 focus:border-[#F28C28]"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className="text-xs sm:text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 bg-white text-[#171B26] focus:outline-none focus:ring-2 focus:ring-[#F28C28]/20 focus:border-[#F28C28]"
          >
            <option value="ALL">All Flows</option>
            <option value="CREDIT">Credits (+ Inflow)</option>
            <option value="DEBIT">Debits (- Outflow)</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs sm:text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 bg-white text-[#171B26] focus:outline-none focus:ring-2 focus:ring-[#F28C28]/20 focus:border-[#F28C28] max-w-[160px]"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Transactions Table */}
      <Card padding="none" className="overflow-hidden bg-white">
        {isLoading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <RefreshCw size={24} className="animate-spin text-[#F28C28]" />
            <p className="text-xs text-[#687080]">Loading ledger records...</p>
          </div>
        ) : paginatedTransactions.length === 0 ? (
          <EmptyState
            title="No matching transactions"
            description="Adjust your search criteria or clear category filters to inspect ledger records."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F0F2F5] text-[#687080] border-b border-[#E5E7EB] font-semibold">
                <tr>
                  <th className="py-3 px-4">Ref ID</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-[#171B26]">
                {paginatedTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#F7F8FA] transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-[#9299A5] font-medium whitespace-nowrap">
                      {tx.id}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-[#687080] text-[11px] font-mono-num">
                      {tx.date}
                    </td>
                    <td className="py-3 px-4 max-w-sm">
                      <span className="font-semibold text-[#171B26] truncate block">{tx.description}</span>
                      <span className="text-[11px] text-[#9299A5] truncate block mt-0.5">{tx.counterparty}</span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-[#687080]">
                      <span className="px-2 py-0.5 rounded bg-[#F0F2F5] text-[11px] font-medium">
                        {tx.category.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-[#687080] text-[11px] font-mono-num">
                      {tx.paymentMethod}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className={`py-3 px-4 text-right whitespace-nowrap font-bold font-mono-num text-sm ${
                      tx.type === 'CREDIT' ? 'text-[#16865C]' : 'text-[#171B26]'
                    }`}>
                      {tx.type === 'CREDIT' ? '+ ' : '- '}
                      ₹{Number(tx.amount).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-[#687080] bg-white">
            <span className="font-mono-num">
              Showing page <strong className="text-[#171B26]">{currentPage}</strong> of <strong className="text-[#171B26]">{totalPages}</strong> ({filtered.length} total)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="p-1.5 rounded-md border border-[#E5E7EB] hover:bg-[#F0F2F5] text-[#171B26] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="p-1.5 rounded-md border border-[#E5E7EB] hover:bg-[#F0F2F5] text-[#171B26] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
