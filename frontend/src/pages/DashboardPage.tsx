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
  RefreshCw,
  Sparkles,
  Bot,
  AlertCircle,
  ShieldAlert,
  ExternalLink
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
      let user = financialService.getCurrentUser();
      try {
        user = await financialService.fetchCurrentUserProfile();
        setCurrentUser(user);
      } catch {
        // Fallback
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
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="animate-spin text-[#F28C28]" size={28} />
          <p className="text-xs font-medium text-[#687080]">Loading financial analytics...</p>
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
  
  // Custom palette for pie chart matching the design system
  const defaultPieColors = ['#F28C28', '#17243A', '#EBCB87', '#16865C', '#D18A22', '#687080', '#9299A5'];
  const categoryData = (dashboardData?.expenseCategories ?? dashboardData?.metrics?.expenseCategories ?? []).map((cat: any, idx: number) => ({
    ...cat,
    color: defaultPieColors[idx % defaultPieColors.length]
  }));

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
        description="Alternative credit profile and cash-flow health derived from verified transaction records."
        badge={currentUser.isDemo ? 'Demo Persona' : 'Live Account'}
        actions={
          <div className="flex items-center gap-2.5">
            <Link to="/upload">
              <Button variant="primary" size="sm" icon={<UploadCloud size={15} />}>
                Import Statement
              </Button>
            </Link>
          </div>
        }
      />

      {/* FraudShield Integrity Callout Banner */}
      {dashboardData?.metrics?.activeIntegrityAlerts > 0 && (
        <div className="p-4 rounded-lg bg-[#FFF8EE] border border-[#FAD8A5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-[#F28C28]/10 text-[#F28C28]">
              <ShieldAlert size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#171B26]">
                  FraudShield Integrity Attention Required
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F28C28]/15 text-[#DD7416]">
                  {dashboardData.metrics.activeIntegrityAlerts} {dashboardData.metrics.activeIntegrityAlerts === 1 ? 'alert' : 'alerts'} pending review
                </span>
              </div>
              <p className="text-[12px] text-[#687080] mt-0.5">
                Potential duplicate entries, circular transfers, or income spikes were detected that may affect your credit calculations.
              </p>
            </div>
          </div>
          <Link
            to="/fraud-shield"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-[#F28C28] bg-white border border-[#FAD8A5] hover:bg-[#FFF3E0] transition-colors shrink-0"
          >
            <span>Review Integrity Ledger</span>
            <ExternalLink size={13} />
          </Link>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-lg bg-[#FDF1F1] border border-[#F9D0D0] flex items-center gap-2.5 text-xs text-[#D94B4B]">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty State Banner if clean account */}
      {hasNoData && (
        <EmptyState
          icon={<UploadCloud size={22} />}
          title="No statements uploaded yet"
          description="You are currently evaluating a fresh account. Upload an actual bank or UPI statement CSV to generate your Financial Trust Score and metric ledger."
          action={
            <Link to="/upload">
              <Button variant="primary" size="sm">
                Upload First Statement
              </Button>
            </Link>
          }
        />
      )}

      {/* 4 Compact Fintech Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Score Card */}
        <Card hoverEffect className="relative overflow-hidden">
          <div className="flex items-center justify-between text-[#687080] text-xs font-semibold uppercase tracking-wider">
            <span>Financial Trust Score</span>
            <ShieldCheck size={18} className="text-[#F28C28]" />
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            {isInsufficient ? (
              <span className="text-lg font-bold text-[#D18A22]">Insufficient Data</span>
            ) : (
              <>
                <span className="text-3xl sm:text-4xl font-extrabold text-[#171B26] font-mono-num">
                  {scoreData?.score}
                </span>
                <span className="text-xs font-medium text-[#9299A5] font-mono-num">/ 100</span>
              </>
            )}
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#687080] pt-2 border-t border-[#E5E7EB]">
            <span>
              {isInsufficient 
                ? 'Requires 60+ days history' 
                : (scoreData?.status === 'PROVISIONAL_2_MONTHS' ? 'Provisional Score' : 'Tier 1 Micro-credit')}
            </span>
            <Link to="/trust-score" className="text-[#F28C28] font-semibold hover:text-[#DD7416] inline-flex items-center gap-0.5">
              <span>Pillars</span>
              <ChevronRight size={12} />
            </Link>
          </div>
        </Card>

        {/* 2. Income Card */}
        <Card hoverEffect>
          <div className="flex items-center justify-between text-[#687080] text-xs font-semibold uppercase tracking-wider">
            <span>Avg Monthly Inflow</span>
            <ArrowUpRight size={18} className="text-[#16865C]" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-[#171B26] font-mono-num">
              ₹{Number(displayInflow).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-[#E5E7EB] text-[11px] text-[#16865C] font-medium flex items-center gap-1 truncate font-mono-num">
            <TrendingUp size={13} className="shrink-0" />
            <span className="truncate">
              {hasNoData 
                ? 'No verified income recorded' 
                : (latestMonth && latestInflow !== undefined 
                  ? `${latestMonth}: ₹${Number(latestInflow).toLocaleString('en-IN')}` 
                  : 'Consistent verified inflows')}
            </span>
          </div>
        </Card>

        {/* 3. Expenses Card */}
        <Card hoverEffect>
          <div className="flex items-center justify-between text-[#687080] text-xs font-semibold uppercase tracking-wider">
            <span>Avg Monthly Outflow</span>
            <ArrowDownRight size={18} className="text-[#D94B4B]" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-[#171B26] font-mono-num">
              ₹{Number(displayExpenses).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-[#E5E7EB] text-[11px] text-[#687080] truncate font-mono-num">
            {hasNoData 
              ? 'No expense history recorded' 
              : (latestMonth && latestExpenses !== undefined 
                ? `${latestMonth}: ₹${Number(latestExpenses).toLocaleString('en-IN')}` 
                : 'Operational & personal spend')}
          </div>
        </Card>

        {/* 4. Closing Reserve Card */}
        <Card hoverEffect>
          <div className="flex items-center justify-between text-[#687080] text-xs font-semibold uppercase tracking-wider">
            <span>Closing Reserve</span>
            <PiggyBank size={18} className="text-[#17243A]" />
          </div>
          <div className="mt-3">
            <span className={`text-2xl sm:text-3xl font-bold font-mono-num ${displayReserve >= 0 ? 'text-[#171B26]' : 'text-[#D94B4B]'}`}>
              ₹{Number(displayReserve).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-[#E5E7EB] text-[11px] text-[#687080] truncate font-mono-num">
            {hasNoData 
              ? 'Upload statements to compute' 
              : (dashboardData?.metrics?.reserveStatus === 'VERIFIED_BALANCE' ? 'Verified closing ledger balance' : 'Cumulative cash flow buffer')}
          </div>
        </Card>
      </div>

      {/* Main Charts Row */}
      {!hasNoData && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Monthly Cash Flow Trend */}
          <Card className="lg:col-span-7">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] mb-4">
              <div>
                <h2 className="text-sm font-bold text-[#171B26]">Monthly Cash Flow Trend</h2>
                <p className="text-xs text-[#687080]">Verified monthly inflows vs operating & living outflows</p>
              </div>
              <span className="text-[11px] font-mono-num text-[#687080] bg-[#F0F2F5] border border-[#E5E7EB] px-2.5 py-0.5 rounded-full font-semibold">
                {periodLabel}
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySummaries} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 11, fill: '#687080', fontFamily: 'IBM Plex Mono' }} 
                    axisLine={{ stroke: '#E5E7EB' }} 
                    tickLine={false} 
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#687080', fontFamily: 'IBM Plex Mono' }} 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(val: number) => val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`}
                  />
                  <Tooltip 
                    formatter={(value: any, name: any) => [
                      `₹${Number(value).toLocaleString('en-IN')}`, 
                      name === 'income' || name === 'Total Inflow' ? 'Total Inflow' : 'Total Outflow'
                    ]}
                    labelFormatter={(label: any) => `${label} Overview`}
                    contentStyle={{ 
                      backgroundColor: '#FFFFFF', 
                      borderRadius: '8px', 
                      border: '1px solid #E5E7EB', 
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(23, 27, 38, 0.08)',
                      fontFamily: 'IBM Plex Sans'
                    }}
                  />
                  {/* Primary Inflow: Brand Orange, Outflow: Clean Slate */}
                  <Bar dataKey="income" name="Total Inflow" fill="#F28C28" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Total Outflow" fill="#687080" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Spending Category Pie */}
          <Card className="lg:col-span-5">
            <div className="pb-3 border-b border-[#E5E7EB] mb-4">
              <h2 className="text-sm font-bold text-[#171B26]">Expense Categorization</h2>
              <p className="text-xs text-[#687080]">Distribution across verified debit categories</p>
            </div>

            <div className="h-64 w-full">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="48%"
                      innerRadius={55}
                      outerRadius={82}
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
                      contentStyle={{ 
                        backgroundColor: '#FFFFFF', 
                        borderRadius: '8px', 
                        border: '1px solid #E5E7EB', 
                        fontSize: '12px', 
                        boxShadow: '0 4px 12px rgba(23, 27, 38, 0.08)' 
                      }}
                    />
                    <Legend 
                      layout="horizontal" 
                      verticalAlign="bottom" 
                      align="center"
                      iconSize={9}
                      wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-[#9299A5]">
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
          <div className="p-4 sm:p-5 border-b border-[#E5E7EB] flex items-center justify-between bg-white">
            <div>
              <h2 className="text-sm font-bold text-[#171B26]">Recent Transactions</h2>
              <p className="text-xs text-[#687080]">Last verified cash flow entries</p>
            </div>
            <Link to="/transactions" className="text-xs font-semibold text-[#F28C28] hover:text-[#DD7416] hover:underline flex items-center gap-1">
              <span>View all ledger</span>
              <ChevronRight size={13} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            {recentTransactions.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F0F2F5] text-[#687080] border-b border-[#E5E7EB] font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Description</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4">Method</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] text-[#171B26]">
                  {recentTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[#F7F8FA] transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-[#687080] text-[11px] font-mono-num">{tx.date}</td>
                      <td className="py-3 px-4 max-w-xs truncate font-medium text-[#171B26]">
                        {tx.description}
                        {tx.isRefund && (
                          <span className="ml-2 text-[10px] bg-[#FEF9EC] text-[#D18A22] border border-[#EBCB87] px-1.5 py-0.5 rounded font-semibold font-mono-num">
                            Refund
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-[#687080]">
                        <span className="px-2 py-0.5 rounded bg-[#F0F2F5] text-[11px] font-medium">
                          {tx.category.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-[#9299A5] text-[11px] font-mono-num">{tx.paymentMethod}</td>
                      <td className={`py-3 px-4 text-right whitespace-nowrap font-bold font-mono-num ${
                        tx.type === 'CREDIT' ? 'text-[#16865C]' : 'text-[#171B26]'
                      }`}>
                        {tx.type === 'CREDIT' ? '+ ' : '- '}
                        ₹{Number(tx.amount).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-10 text-center text-xs text-[#9299A5]">
                No recent transactions recorded. Upload a statement to populate your ledger.
              </div>
            )}
          </div>
        </Card>

        {/* Financial Wellness Insights & AI Coach Card */}
        <Card className="lg:col-span-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="pb-3 border-b border-[#E5E7EB]">
              <span className="text-[10px] font-bold text-[#F28C28] uppercase tracking-wider block">
                Cash Flow Insight
              </span>
              <h2 className="text-base font-bold text-[#171B26] mt-0.5">Operating Fuel Efficiency</h2>
            </div>
            
            <p className="text-xs text-[#687080] leading-relaxed">
              {hasNoData ? (
                'Upload bank or UPI statements to evaluate operating expense ratios against gross earnings.'
              ) : fuelPct > 0 ? (
                <>Fuel and transport accounted for <strong className="text-[#171B26] font-mono-num">{fuelPct}%</strong> of your gross platform income across the evaluated period. Staying below 25% strengthens your <em>Expense Health</em> score.</>
              ) : (
                'Operating expenses are tracked against verified income to evaluate cash-flow sustainability.'
              )}
            </p>

            <div className="p-3.5 rounded-lg bg-[#FFF5EB] border border-[#F28C28]/25 text-xs text-[#171B26] space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-[#F28C28]">
                <Sparkles size={14} />
                <span>Pre-Qualified Credit Buffer</span>
              </div>
              <p className="text-[11px] text-[#687080] leading-relaxed">
                {isInsufficient ? (
                  'Complete at least 60 days of verified transaction history to unlock pre-qualified credit lines.'
                ) : (
                  `Your Trust Score of ${scoreData?.score} makes you eligible for working capital lines starting at 12% APR.`
                )}
              </p>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-[#E5E7EB] flex flex-col gap-2.5">
            <Link to="/coach">
              <Button variant="primary" size="sm" className="w-full" icon={<Bot size={15} />}>
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
