import React, { useState, useEffect } from 'react';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight,
  ArrowUpDown
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
  const itemsPerPage = 10;

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

  const categories = Array.from(new Set(transactions.map(t => t.category)));
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedTransactions = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Statement Transactions"
        description="Unified ledger parsed from bank statements and UPI payment history."
        badge={`${filtered.length} Records`}
      />

      {/* Filter and Search Bar */}
      <Card padding="sm" className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search description, counterparty, or transaction ID..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300/80 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 focus:border-teal-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className="text-xs border border-slate-300/80 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-600"
          >
            <option value="ALL">All Flow Types</option>
            <option value="CREDIT">Credits (Income)</option>
            <option value="DEBIT">Debits (Expenses)</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs border border-slate-300/80 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-600 max-w-[150px]"
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
      <Card padding="none" className="overflow-hidden">
        {paginatedTransactions.length === 0 ? (
          <EmptyState
            title="No matching transactions"
            description="Adjust your search criteria or select all categories to see records."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200/80 font-medium">
                <tr>
                  <th className="py-2.5 px-4">Ref ID</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Method</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-400 font-medium">
                      {tx.id}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                      {tx.date}
                    </td>
                    <td className="py-2.5 px-4 max-w-xs">
                      <span className="font-medium text-slate-800 truncate block">{tx.description}</span>
                      <span className="text-[10px] text-slate-400 truncate block">{tx.counterparty}</span>
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap text-slate-600">
                      {tx.category.replace(/_/g, ' ')}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                      {tx.paymentMethod}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className={`py-2.5 px-4 text-right whitespace-nowrap font-semibold ${
                      tx.type === 'CREDIT' ? 'text-emerald-700' : 'text-slate-900'
                    }`}>
                      {tx.type === 'CREDIT' ? '+ ' : '- '}
                      ₹{tx.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
