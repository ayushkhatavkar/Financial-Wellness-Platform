import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Wallet,
  FileCheck2,
  Sliders,
  Scale
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
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
        <RefreshCw className="animate-spin text-[#F28C28]" size={26} />
        <p className="text-xs text-[#687080] font-medium">Calculating cash-flow trust score...</p>
      </div>
    );
  }

  const isInsufficient = scoreData.status === 'INSUFFICIENT_DATA';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Financial Trust Score"
        description="Deterministic, cash-flow derived alternative credit score without bureau dependency."
        badge={`Engine: ${scoreData.version}`}
      />

      {/* Main Score Hero Card */}
      <Card className="p-6 sm:p-8 bg-white shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          
          {/* Left Score Dial Display */}
          <div className="md:col-span-5 text-center md:border-r md:border-[#E5E7EB] md:pr-8">
            <span className="text-[11px] font-bold text-[#687080] uppercase tracking-wider block mb-3">
              Trust Score Standing
            </span>
            {isInsufficient ? (
              <div className="py-4 space-y-2">
                <div className="w-28 h-28 rounded-full bg-[#FEF9EC] border-2 border-[#EBCB87] mx-auto flex items-center justify-center text-[#D18A22] font-extrabold text-2xl font-mono-num shadow-sm">
                  N/A
                </div>
                <h3 className="text-sm font-bold text-[#171B26]">Insufficient History</h3>
                <p className="text-[11px] text-[#687080] max-w-xs mx-auto leading-relaxed">
                  Missing records are never penalized. At least 60 days of verified transaction records are required to produce a robust score.
                </p>
              </div>
            ) : (
              <div className="py-2 space-y-3">
                <div className="w-32 h-32 rounded-full bg-white border-[5px] border-[#F28C28] mx-auto flex flex-col items-center justify-center text-[#171B26] shadow-[0_4px_16px_0_rgba(242,140,40,0.15)]">
                  <span className="text-4xl font-extrabold font-mono-num">{scoreData.score}</span>
                  <span className="text-[10px] font-bold tracking-wider text-[#9299A5] uppercase">out of 100</span>
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EDF8F3] border border-[#BDE8D3] text-[#16865C] text-xs font-semibold">
                    <CheckCircle2 size={14} className="text-[#16865C]" />
                    <span>Tier 1 Micro-Lending Eligible</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right Explanation & Mathematical Formula */}
          <div className="md:col-span-7 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Scale size={16} className="text-[#F28C28]" />
                <h3 className="text-sm font-bold text-[#171B26] uppercase tracking-wider">
                  Deterministic Mathematical Formula
                </h3>
              </div>
              <p className="text-xs text-[#687080] leading-relaxed">
                {scoreData.explanation}
              </p>
            </div>

            <div className="p-3.5 bg-[#F0F2F5] rounded-lg border border-[#E5E7EB] font-mono text-xs text-[#171B26] space-y-1.5">
              <span className="text-[#F28C28] font-bold block text-[11px] uppercase tracking-wider">
                Evaluation Weights:
              </span>
              <p className="text-[11px] text-[#171B26] leading-relaxed font-mono-num">
                Score = (0.30 × Income) + (0.25 × Savings) + (0.30 × Expense) + (0.15 × Bill Payment)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div className="p-3 rounded-lg bg-[#F7F8FA] border border-[#E5E7EB]">
                <span className="text-[#687080] block text-[10px] font-semibold uppercase tracking-wider">
                  Observation Period
                </span>
                <span className="font-bold text-[#171B26] text-xs font-mono-num mt-0.5 block">
                  {scoreData.monthsOfData} Months Recorded
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#F7F8FA] border border-[#E5E7EB]">
                <span className="text-[#687080] block text-[10px] font-semibold uppercase tracking-wider">
                  Avg Platform Inflow
                </span>
                <span className="font-bold text-[#171B26] text-xs font-mono-num mt-0.5 block">
                  ₹{Number(scoreData.averageMonthlyIncome).toLocaleString('en-IN')}/mo
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 4 Pillars Breakdown Cards */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-[#171B26]">The 4 Transparent Component Pillars</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Income Stability */}
          <Card hoverEffect className="space-y-3 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-full bg-[#FFF5EB] text-[#F28C28] border border-[#F28C28]/25 text-xs font-bold font-mono-num flex items-center justify-center">
                  30%
                </span>
                <span className="font-bold text-[#171B26] text-sm">Income Stability</span>
              </div>
              <span className="text-sm font-bold font-mono-num text-[#171B26]">
                {scoreData.components.incomeStability.score !== null ? `${scoreData.components.incomeStability.score}/100` : 'N/A'}
              </span>
            </div>
            <p className="text-xs text-[#687080] leading-relaxed">
              {scoreData.components.incomeStability.description}
            </p>
            <div className="p-3 bg-[#F0F2F5] rounded-md text-[11px] text-[#687080] border border-[#E5E7EB]">
              <strong className="text-[#171B26] font-semibold">Guidance: </strong>
              {scoreData.components.incomeStability.tips}
            </div>
          </Card>

          {/* 2. Savings Consistency */}
          <Card hoverEffect className="space-y-3 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-full bg-[#FEF9EC] text-[#D18A22] border border-[#EBCB87] text-xs font-bold font-mono-num flex items-center justify-center">
                  25%
                </span>
                <span className="font-bold text-[#171B26] text-sm">Savings Consistency</span>
              </div>
              <span className="text-sm font-bold font-mono-num text-[#171B26]">
                {scoreData.components.savingsConsistency.score !== null ? `${scoreData.components.savingsConsistency.score}/100` : 'N/A'}
              </span>
            </div>
            <p className="text-xs text-[#687080] leading-relaxed">
              {scoreData.components.savingsConsistency.description}
            </p>
            <div className="p-3 bg-[#F0F2F5] rounded-md text-[11px] text-[#687080] border border-[#E5E7EB]">
              <strong className="text-[#171B26] font-semibold">Guidance: </strong>
              {scoreData.components.savingsConsistency.tips}
            </div>
          </Card>

          {/* 3. Expense Health */}
          <Card hoverEffect className="space-y-3 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-full bg-[#EDF8F3] text-[#16865C] border border-[#16865C]/30 text-xs font-bold font-mono-num flex items-center justify-center">
                  30%
                </span>
                <span className="font-bold text-[#171B26] text-sm">Expense Health</span>
              </div>
              <span className="text-sm font-bold font-mono-num text-[#171B26]">
                {scoreData.components.expenseHealth.score !== null ? `${scoreData.components.expenseHealth.score}/100` : 'N/A'}
              </span>
            </div>
            <p className="text-xs text-[#687080] leading-relaxed">
              {scoreData.components.expenseHealth.description}
            </p>
            <div className="p-3 bg-[#F0F2F5] rounded-md text-[11px] text-[#687080] border border-[#E5E7EB]">
              <strong className="text-[#171B26] font-semibold">Guidance: </strong>
              {scoreData.components.expenseHealth.tips}
            </div>
          </Card>

          {/* 4. Bill Payment Consistency */}
          <Card hoverEffect className="space-y-3 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-full bg-[#F0F2F5] text-[#17243A] border border-[#E5E7EB] text-xs font-bold font-mono-num flex items-center justify-center">
                  15%
                </span>
                <span className="font-bold text-[#171B26] text-sm">Bill Payment Consistency</span>
              </div>
              <span className="text-sm font-bold font-mono-num text-[#171B26]">
                {scoreData.components.billPaymentConsistency.score !== null ? `${scoreData.components.billPaymentConsistency.score}/100` : 'N/A'}
              </span>
            </div>
            <p className="text-xs text-[#687080] leading-relaxed">
              {scoreData.components.billPaymentConsistency.description}
            </p>
            <div className="p-3 bg-[#F0F2F5] rounded-md text-[11px] text-[#687080] border border-[#E5E7EB]">
              <strong className="text-[#171B26] font-semibold">Guidance: </strong>
              {scoreData.components.billPaymentConsistency.tips}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
