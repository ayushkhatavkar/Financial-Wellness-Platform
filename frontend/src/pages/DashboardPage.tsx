import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  ArrowUpRight, 
  ArrowDownRight, 
  PiggyBank, 
  UploadCloud, 
  ChevronRight,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { financialService } from '../services/financialService';
import { User, ScoreBreakdown, MonthlyFinancialSummary, Transaction } from '../types';
import { Card, PageHeader, Button, EmptyState } from '../components/common';

export const DashboardPage: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User>(financialService.getCurrentUser());
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [scoreData, setScoreData] = useState<ScoreBreakdown | null>(null);
  const [monthlySummaries, setMonthlySummaries] = useState<MonthlyFinancialSummary[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Refresh current user from verified auth
      let user = financialService.getCurrentUser();
      try {
        user = await financialService.fetchCurrentUserProfile();
        setCurrentUser(user);
      } catch {
        // If not logged in, user remains guest or current
      }

      const summary = await financialService.getDashboardSummary();
      setDashboardData(summary);
      setScoreData(summary.score || null);
      setMonthlySummaries(summary.monthlySummaries || []);
      setRecentTransactions(summary.recentTransactions || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="animate-spin text-teal-700" size={24} />
          <p className="text-xs text-slate-500">Loading overview...</p>
        </div>
      </div>
    );
  }

  const isInsufficient = scoreData?.status === 'INSUFFICIENT_DATA' || !scoreData?.score;
  const hasNoData = monthlySummaries.length === 0;

  // Strict user-specific calculated metrics from backend
  const displayInflow = dashboardData?.metrics?.averageMonthlyInflow ?? scoreData?.averageMonthlyIncome ?? 0;
  const displayExpenses = dashboardData?.metrics?.monthlyExpenses ?? 
    (monthlySummaries.length > 0 ? Math.round(monthlySummaries.reduce((acc, m) => acc + m.expenses, 0) / monthlySummaries.length) : 0);
  const displayReserve = dashboardData?.metrics?.closingReserve ?? 
    (monthlySummaries.length > 0 ? monthlySummaries[monthlySummaries.length - 1].closingBalance : 0);
  const categoryData = dashboardData?.expenseCategories ?? dashboardData?.metrics?.expenseCategories ?? [];

  const latestMonth = dashboardData?.metrics?.latestMonthLabel;
  const latestInflow = dashboardData?.metrics?.latestMonthlyInflow;
  const latestExpenses = dashboardData?.metrics?.latestMonthlyExpenses;

  const periodLabel = monthlySummaries.length > 0 
    ? `${monthlySummaries.length}-Month Period` 
    : 'No statement data';

  const fuelCat = categoryData.find((c: any) => c.name.toLowerCase().includes('fuel'));
  const totalInc = dashboardData?.metrics?.totalIncome || 0;
  const fuelPct = (totalInc > 0 && fuelCat) ? Math.round((fuelCat.value / totalInc) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <PageHeader
        title={`Welcome back, ${currentUser.fullName}`}
        description="Alternative credit profile and cash flow health from verified transaction records."
        badge={currentUser.isDemo ? 'Demo Mode' : 'Live Registered'}
        actions={
          <Link to="/upload">
            <Button variant="primary" size="sm" icon={<UploadCloud size={14} />}>
              Import Statement
            </Button>
          </Link>
        }
      />

      {/* Empty State Banner if clean account */}
      {hasNoData && (
        <EmptyState
          icon={<UploadCloud size={20} />}
          title="No statements uploaded yet"
          description="You are currently in a fresh account. Upload a sample or actual bank/UPI statement CSV to generate your Financial Trust Score and metrics."
          action={
            <Link to="/upload">
              <Button variant="primary" size="sm">
                Upload First Statement
              </Button>
            </Link>
          }
        />
      )}

      {/* 4 Compact Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Score Card */}
        <Card className="hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>TRUST SCORE</span>
            <ShieldCheck size={16} className="text-teal-700" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            {isInsufficient ? (
              <span className="text-base font-bold text-amber-700">Insufficient Data</span>
            ) : (
              <>
                <span className="text-3xl font-extrabold text-slate-900">{scoreData?.score}</span>
                <span className="text-xs font-medium text-slate-400">/ 100</span>
              </>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>{isInsufficient ? 'Requires 60+ days history' : (scoreData?.status === 'PROVISIONAL_2_MONTHS' ? 'Provisional Score' : 'Tier 1 Micro-credit')}</span>
            <Link to="/trust-score" className="text-teal-700 font-medium hover:underline inline-flex items-center">
              Pillars <ChevronRight size={12} />
            </Link>
          </div>
        </Card>

        {/* Income Card */}
        <Card className="hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>AVG MONTHLY INFLOW</span>
            <ArrowUpRight size={16} className="text-emerald-600" />
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-bold text-slate-900">
              ₹{displayInflow.toLocaleString('en-IN')}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-emerald-700 font-medium flex items-center gap-1">
            <TrendingUp size={12} /> {hasNoData 
              ? 'No verified income recorded' 
              : (latestMonth && latestInflow !== undefined 
                ? `${latestMonth} total: ₹${Number(latestInflow).toLocaleString('en-IN')}` 
                : 'Consistent monthly payouts')}
          </p>
        </Card>

        {/* Expenses Card */}
        <Card className="hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>AVG MONTHLY OUTFLOW</span>
            <ArrowDownRight size={16} className="text-rose-600" />
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-bold text-slate-900">
              ₹{displayExpenses.toLocaleString('en-IN')}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            {hasNoData 
              ? 'No expense history recorded' 
              : (latestMonth && latestExpenses !== undefined 
                ? `${latestMonth} total: ₹${Number(latestExpenses).toLocaleString('en-IN')}` 
                : 'Average operating & personal outflows')}
          </p>
        </Card>

        {/* Savings Card */}
        <Card className="hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>CLOSING RESERVE</span>
            <PiggyBank size={16} className="text-teal-700" />
          </div>
          <div className="mt-2.5">
            <span className={`text-2xl font-bold ${displayReserve >= 0 ? 'text-teal-800' : 'text-rose-700'}`}>
              ₹{displayReserve.toLocaleString('en-IN')}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            {hasNoData 
              ? 'Unavailable until statements uploaded' 
              : (dashboardData?.metrics?.reserveStatus === 'VERIFIED_BALANCE' ? 'Verified statement closing balance' : 'Cumulative net cash flow cushion')}
          </p>
        </Card>
      </div>

      {/* Main Charts Row */}
      {!hasNoData && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Monthly Cash Flow Trend */}
          <Card className="lg:col-span-7">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Monthly Cash Flow Trend</h2>
                <p className="text-xs text-slate-500">Total monthly inflows vs operating & living outflows</p>
              </div>
              <span className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded font-medium">
                {periodLabel}
              </span>
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySummaries} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(val: number) => val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`}
                  />
                  <Tooltip 
                    formatter={(value: any, name: any) => [
                      `₹${Number(value).toLocaleString('en-IN')}`, 
                      name === 'income' || name === 'Total Inflow' ? 'Total Inflow' : 'Total Outflow'
                    ]}
                    labelFormatter={(label: any) => `${label} (Monthly Total)`}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}
                  />
                  <Bar dataKey="income" name="Total Inflow" fill="#0f766e" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="expenses" name="Total Outflow" fill="#94a3b8" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Spending Category Pie */}
          <Card className="lg:col-span-5">
            <div className="pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-sm font-semibold text-slate-900">Expense Categorization</h2>
              <p className="text-xs text-slate-500">Distribution across verified spend categories</p>
            </div>

            <div className="h-60 w-full">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="48%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categoryData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any, name: any, props: any) => [
                        `₹${Number(value).toLocaleString('en-IN')} (${props?.payload?.percentage || Math.round((Number(value) / (dashboardData?.metrics?.totalExpenses || 1)) * 100)}%)`, 
                        name
                      ]}
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}
                    />
                    <Legend 
                      layout="horizontal" 
                      verticalAlign="bottom" 
                      align="center"
                      iconSize={8}
                      wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No debit categories to display
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Bottom Grid: Recent Activity & Financial Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Transactions Table */}
        <Card padding="none" className="lg:col-span-8 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Recent Transactions</h2>
              <p className="text-xs text-slate-500">Last verified statement entries</p>
            </div>
            <Link to="/transactions" className="text-xs font-medium text-teal-800 hover:underline">
              View all &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto">
            {recentTransactions.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100 font-medium">
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Description</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4">Method</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {recentTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 text-[11px]">{tx.date}</td>
                      <td className="py-3 px-4 max-w-xs truncate font-medium text-slate-800">
                        {tx.description}
                        {tx.isRefund && (
                          <span className="ml-1.5 text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-1 py-0.5 rounded font-medium">
                            Refund
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                        {tx.category.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 text-[11px]">{tx.paymentMethod}</td>
                      <td className={`py-3 px-4 text-right whitespace-nowrap font-semibold ${
                        tx.type === 'CREDIT' ? 'text-emerald-700' : 'text-slate-900'
                      }`}>
                        {tx.type === 'CREDIT' ? '+ ' : '- '}
                        ₹{tx.amount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No recent transactions recorded. Upload a statement to populate your ledger.
              </div>
            )}
          </div>
        </Card>

        {/* Financial Wellness Insights Panel */}
        <Card className="lg:col-span-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="pb-2 border-b border-slate-100">
              <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block">Financial Insight</span>
              <h2 className="text-sm font-semibold text-slate-900 mt-0.5">Operating Fuel Efficiency</h2>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed">
              {hasNoData ? (
                'Upload bank or UPI statements to evaluate operating expense ratios against gross earnings.'
              ) : fuelPct > 0 ? (
                <>Fuel and transport accounted for <strong>{fuelPct}%</strong> of your gross platform income across the evaluated period. Staying below 25% strengthens your <em>Expense Health</em> score.</>
              ) : (
                'Operating expenses are tracked against verified income to evaluate cash-flow sustainability.'
              )}
            </p>

            <div className="p-3 rounded-lg bg-teal-50/60 border border-teal-200/60 text-xs text-teal-900 space-y-1">
              <p className="font-semibold text-teal-950">Pre-Qualified Credit Buffer</p>
              <p className="text-[11px] text-teal-800 leading-normal">
                {isInsufficient ? (
                  'Complete at least 60 days of verified transaction history to unlock pre-qualified credit lines.'
                ) : (
                  `Your Trust Score of ${scoreData?.score} makes you eligible for working capital lines starting at 12% APR.`
                )}
              </p>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex flex-col gap-2">
            <Link to="/coach">
              <Button variant="primary" size="sm" className="w-full">
                Ask AI Financial Coach &rarr;
              </Button>
            </Link>
            <Link to="/wellness">
              <Button variant="outline" size="sm" className="w-full">
                Review Wellness Recommendations
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
