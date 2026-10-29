import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  CheckCircle, 
  Info,
  ChevronRight
} from 'lucide-react';
import { financialService } from '../services/financialService';
import { ScoreBreakdown } from '../types';
import { Card, PageHeader } from '../components/common';

export const TrustScorePage: React.FC = () => {
  const [scoreData, setScoreData] = useState<ScoreBreakdown | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    financialService.getTrustScore().then((res) => {
      setScoreData(res);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  if (loading || !scoreData) {
    return <div className="p-8 text-center text-xs text-slate-500">Calculating trust score...</div>;
  }

  const isInsufficient = scoreData.status === 'INSUFFICIENT_DATA';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Financial Trust Score"
        description="Explainable, cash-flow derived score without traditional bureau dependency."
        badge={`Engine: ${scoreData.version}`}
      />

      {/* Main Score Hero Card */}
      <Card className="p-6 sm:p-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          
          {/* Left score dial */}
          <div className="md:col-span-5 text-center md:border-r md:border-slate-100 md:pr-8">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
              Trust Standing
            </span>
            {isInsufficient ? (
              <div className="py-4">
                <div className="w-24 h-24 rounded-full bg-amber-50 border-2 border-amber-300 mx-auto flex items-center justify-center text-amber-700 font-bold text-lg">
                  N/A
                </div>
                <h3 className="mt-3 text-sm font-bold text-amber-950">Insufficient Data</h3>
                <p className="text-[11px] text-amber-800 mt-1 max-w-xs mx-auto leading-relaxed">
                  Missing records are never penalized. At least 60 days of verified transaction history is required.
                </p>
              </div>
            ) : (
              <div className="py-2">
                <div className="w-28 h-28 rounded-full bg-teal-50 border-4 border-teal-700 mx-auto flex flex-col items-center justify-center text-teal-900 shadow-sm">
                  <span className="text-3xl font-extrabold">{scoreData.score}</span>
                  <span className="text-[10px] font-semibold text-teal-700">OUT OF 100</span>
                </div>
                <div className="mt-3 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                  <CheckCircle size={13} className="text-emerald-600" />
                  <span>Tier 1 Micro-Lending Eligible</span>
                </div>
              </div>
            )}
          </div>

          {/* Right explanation & formula */}
          <div className="md:col-span-7 space-y-3.5">
            <h3 className="text-sm font-semibold text-slate-900">Deterministic Mathematical Formula</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {scoreData.explanation}
            </p>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 font-mono text-xs text-slate-700 space-y-1">
              <span className="text-teal-900 font-semibold block text-[11px]">Evaluation Weights:</span>
              <p className="text-[11px] text-slate-600 leading-normal">
                Trust Score = (0.30 × Income) + (0.25 × Savings) + (0.30 × Expense) + (0.15 × Bill Payment)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60">
                <span className="text-slate-400 block text-[10px]">Observation Window</span>
                <span className="font-semibold text-slate-800 text-xs">{scoreData.monthsOfData} Months Recorded</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60">
                <span className="text-slate-400 block text-[10px]">Avg Platform Inflow</span>
                <span className="font-semibold text-slate-800 text-xs">₹{scoreData.averageMonthlyIncome.toLocaleString('en-IN')}/mo</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 4 Pillars Breakdown Cards */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">The 4 Component Indicators</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Income Stability */}
          <Card className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold flex items-center justify-center">
                  30%
                </span>
                <span className="font-semibold text-slate-900 text-xs sm:text-sm">Income Stability</span>
              </div>
              <span className="text-xs sm:text-sm font-bold text-teal-800">
                {scoreData.components.incomeStability.score ?? 'N/A'}/100
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {scoreData.components.incomeStability.description}
            </p>
            <div className="p-2.5 bg-slate-50 rounded-lg text-[11px] text-slate-600 border border-slate-100">
              <strong className="text-slate-800 font-semibold">Guidance:</strong> {scoreData.components.incomeStability.tips}
            </div>
          </Card>

          {/* Savings Consistency */}
          <Card className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold flex items-center justify-center">
                  25%
                </span>
                <span className="font-semibold text-slate-900 text-xs sm:text-sm">Savings Consistency</span>
              </div>
              <span className="text-xs sm:text-sm font-bold text-teal-800">
                {scoreData.components.savingsConsistency.score ?? 'N/A'}/100
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {scoreData.components.savingsConsistency.description}
            </p>
            <div className="p-2.5 bg-slate-50 rounded-lg text-[11px] text-slate-600 border border-slate-100">
              <strong className="text-slate-800 font-semibold">Guidance:</strong> {scoreData.components.savingsConsistency.tips}
            </div>
          </Card>

          {/* Expense Health */}
          <Card className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold flex items-center justify-center">
                  30%
                </span>
                <span className="font-semibold text-slate-900 text-xs sm:text-sm">Expense Health</span>
              </div>
              <span className="text-xs sm:text-sm font-bold text-teal-800">
                {scoreData.components.expenseHealth.score ?? 'N/A'}/100
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {scoreData.components.expenseHealth.description}
            </p>
            <div className="p-2.5 bg-slate-50 rounded-lg text-[11px] text-slate-600 border border-slate-100">
              <strong className="text-slate-800 font-semibold">Guidance:</strong> {scoreData.components.expenseHealth.tips}
            </div>
          </Card>

          {/* Bill Payment Consistency */}
          <Card className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold flex items-center justify-center">
                  15%
                </span>
                <span className="font-semibold text-slate-900 text-xs sm:text-sm">Bill Payment Consistency</span>
              </div>
              <span className="text-xs sm:text-sm font-bold text-teal-800">
                {scoreData.components.billPaymentConsistency.score ?? 'N/A'}/100
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {scoreData.components.billPaymentConsistency.description}
            </p>
            <div className="p-2.5 bg-slate-50 rounded-lg text-[11px] text-slate-600 border border-slate-100">
              <strong className="text-slate-800 font-semibold">Guidance:</strong> {scoreData.components.billPaymentConsistency.tips}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
