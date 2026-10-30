import React, { useEffect, useState } from 'react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  HelpCircle, 
  Calculator, 
  TrendingDown, 
  TrendingUp, 
  PiggyBank, 
  Calendar, 
  Percent, 
  ArrowRight,
  Info,
  Clock,
  Sparkles,
  RefreshCw,
  Sliders,
  DollarSign
} from 'lucide-react';
import { financialService } from '../services/financialService';
import { 
  AffordabilityBaseline, 
  LoanAffordabilityResult 
} from '../types';
import { Card, PageHeader, Button, Input } from '../components/common';

export const LoanOffersPage: React.FC = () => {
  // Financial baseline
  const [baseline, setBaseline] = useState<AffordabilityBaseline | null>(null);
  const [loadingBaseline, setLoadingBaseline] = useState(true);

  // Loan calculator input state
  const [loanAmount, setLoanAmount] = useState<number>(25000);
  const [interestRate, setInterestRate] = useState<number>(14.0);
  const [tenureMonths, setTenureMonths] = useState<number>(12);
  const [processingFee, setProcessingFee] = useState<number>(0);

  // Assessment result and sync tracking
  const [assessment, setAssessment] = useState<LoanAffordabilityResult | null>(null);
  const [lastEvaluatedParams, setLastEvaluatedParams] = useState<{
    loanAmount: number;
    interestRate: number;
    tenureMonths: number;
    processingFee: number;
  } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);

  const isStale = lastEvaluatedParams !== null && (
    loanAmount !== lastEvaluatedParams.loanAmount ||
    interestRate !== lastEvaluatedParams.interestRate ||
    tenureMonths !== lastEvaluatedParams.tenureMonths ||
    processingFee !== lastEvaluatedParams.processingFee
  );

  useEffect(() => {
    loadBaseline();
  }, []);

  const loadBaseline = async () => {
    setLoadingBaseline(true);
    try {
      const data = await financialService.getLoanAffordabilityBaseline();
      setBaseline(data);
      // Run initial check with default 25,000 / 14% / 12 months
      await runAffordabilityCheck(25000, 14.0, 12, 0);
    } catch (err: any) {
      console.error('Failed to load affordability baseline:', err);
    } finally {
      setLoadingBaseline(false);
    }
  };

  const runAffordabilityCheck = async (
    amt: number = loanAmount,
    rate: number = interestRate,
    tenure: number = tenureMonths,
    fee: number = processingFee
  ) => {
    if (amt <= 0 || tenure <= 0 || rate < 0) {
      setCalcError('Please enter positive values for loan amount and tenure.');
      return;
    }
    setCalcError(null);
    setIsCalculating(true);
    try {
      const result = await financialService.checkLoanAffordability({
        loanAmount: amt,
        annualInterestRate: rate,
        tenureMonths: tenure,
        processingFee: fee || 0,
      });
      // Atomically update both the assessment and the parameters that produced it
      setAssessment(result);
      setLastEvaluatedParams({
        loanAmount: amt,
        interestRate: rate,
        tenureMonths: tenure,
        processingFee: fee || 0,
      });
    } catch (err: any) {
      setCalcError(err.message || 'Failed to calculate loan affordability.');
    } finally {
      setIsCalculating(false);
    }
  };

  const handlePresetSelect = (presetAmt: number) => {
    setLoanAmount(presetAmt);
    runAffordabilityCheck(presetAmt, interestRate, tenureMonths, processingFee);
  };

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case 'LIKELY_AFFORDABLE':
        return {
          icon: <CheckCircle2 size={24} className="text-emerald-700 shrink-0" />,
          title: 'Likely Affordable',
          tagClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          containerClass: 'bg-emerald-50/70 border-emerald-300',
          summaryText: 'This loan fits within your verified monthly surplus and passes the earnings drop stress test.'
        };
      case 'PROCEED_WITH_CAUTION':
        return {
          icon: <AlertTriangle size={24} className="text-amber-700 shrink-0" />,
          title: 'Proceed with Caution',
          tagClass: 'bg-amber-100 text-amber-900 border-amber-300',
          containerClass: 'bg-amber-50/70 border-amber-300',
          summaryText: 'Manageable in normal months, but a seasonal or monsoon delivery dip will cause cash shortages.'
        };
      case 'NOT_AFFORDABLE':
        return {
          icon: <XCircle size={24} className="text-rose-700 shrink-0" />,
          title: 'Not Affordable with Current Finances',
          tagClass: 'bg-rose-100 text-rose-900 border-rose-300',
          containerClass: 'bg-rose-50/70 border-rose-300',
          summaryText: 'High risk of debt trap. The proposed EMI causes a cash deficit or consumes over 50% of your earnings.'
        };
      default:
        return {
          icon: <HelpCircle size={24} className="text-slate-600 shrink-0" />,
          title: 'Insufficient Data to Assess',
          tagClass: 'bg-slate-100 text-slate-800 border-slate-300',
          containerClass: 'bg-slate-50 border-slate-300',
          summaryText: 'A minimum of 60 days of verified transaction statements is required for borrowing capacity modeling.'
        };
    }
  };

  const presets = [10000, 25000, 50000, 100000, 300000];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* 1. Page Header */}
      <PageHeader
        title="Can I Afford This Loan?"
        description="Understand your repayment capacity before you borrow."
      />

      {/* 2. User's Financial Position Review Cards */}
      {baseline && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600 px-0.5">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Calculator size={14} className="text-teal-700" />
              Your Verified Cash Flow Position
            </span>
            <span className="text-[11px] text-slate-500">
              Based on {baseline.monthsAnalyzed} month(s) of statements
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-3 border-slate-200">
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Monthly Inflow</span>
              <span className="text-base font-bold text-slate-900 block mt-0.5">
                ₹{baseline.averageMonthlyIncome.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-slate-500">
                Conservative: ₹{baseline.conservativeMonthlyIncome.toLocaleString('en-IN')}
              </span>
            </Card>

            <Card className="p-3 border-slate-200">
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Living &amp; Work Costs</span>
              <span className="text-base font-bold text-slate-900 block mt-0.5">
                ₹{(baseline.essentialLivingExpenses + baseline.necessaryBusinessExpenses).toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-slate-500">
                Food, bills, fuel &amp; servicing
              </span>
            </Card>

            <Card className="p-3 border-slate-200">
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Existing Debt &amp; Bills</span>
              <span className="text-base font-bold text-slate-900 block mt-0.5">
                ₹{(baseline.existingLoanCommitments + baseline.upcomingBills).toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-slate-500">
                {baseline.existingLoanCommitments > 0 ? `Active loans: ₹${baseline.existingLoanCommitments}` : 'No active loans'}
              </span>
            </Card>

            <Card className="p-3 border-slate-200 bg-teal-50/30">
              <span className="text-[10px] text-teal-800 block uppercase font-semibold">Pre-Loan Surplus Buffer</span>
              <span className={`text-base font-bold block mt-0.5 ${
                baseline.disposableIncomeBeforeLoan >= 0 ? 'text-teal-900' : 'text-rose-700'
              }`}>
                ₹{baseline.disposableIncomeBeforeLoan.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-teal-700">
                Available before new loan
              </span>
            </Card>
          </div>
        </div>
      )}

      {/* 3. Interactive Loan Affordability Calculator */}
      <Card className="p-5 border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Enter Proposed Loan Terms</h3>
            <p className="text-xs text-slate-500">
              Test any loan, emergency borrowing, or two-wheeler EMI against your actual income.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400">Quick amounts:</span>
            {presets.map((p) => (
              <button
                key={p}
                onClick={() => handlePresetSelect(p)}
                className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                  loanAmount === p 
                    ? 'bg-teal-700 text-white border-teal-700 font-semibold' 
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                ₹{(p / 1000).toFixed(0)}k
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Loan Amount (₹)
            </label>
            <Input
              type="number"
              value={loanAmount}
              onChange={(e) => setLoanAmount(Number(e.target.value))}
              min={1000}
              step={1000}
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Annual Interest Rate (% APR)
            </label>
            <Input
              type="number"
              value={interestRate}
              onChange={(e) => setInterestRate(Number(e.target.value))}
              min={0}
              max={60}
              step={0.5}
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">0% for interest-free loans</span>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Tenure (Months)
            </label>
            <select
              value={tenureMonths}
              onChange={(e) => setTenureMonths(Number(e.target.value))}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-600 focus:bg-white"
            >
              <option value={3}>3 Months</option>
              <option value={6}>6 Months</option>
              <option value={9}>9 Months</option>
              <option value={12}>12 Months (1 Year)</option>
              <option value={18}>18 Months</option>
              <option value={24}>24 Months (2 Years)</option>
              <option value={36}>36 Months (3 Years)</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Processing Fee (₹, Optional)
            </label>
            <Input
              type="number"
              value={processingFee}
              onChange={(e) => setProcessingFee(Number(e.target.value))}
              min={0}
              step={50}
            />
          </div>
        </div>

        {calcError && (
          <div className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded-lg border border-rose-200 flex items-center justify-between">
            <span>{calcError}</span>
            <button 
              onClick={() => runAffordabilityCheck(loanAmount, interestRate, tenureMonths, processingFee)}
              className="text-rose-800 font-bold underline hover:no-underline ml-2"
            >
              Retry
            </button>
          </div>
        )}

        {isStale && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-700 shrink-0" />
              <span>
                <strong>Inputs changed:</strong> Current form has 
                ₹{loanAmount.toLocaleString('en-IN')} ({tenureMonths} mos @ {interestRate}% APR). 
                The assessment below was calculated for 
                ₹{lastEvaluatedParams?.loanAmount.toLocaleString('en-IN')}.
              </span>
            </div>
            <button
              onClick={() => runAffordabilityCheck(loanAmount, interestRate, tenureMonths, processingFee)}
              disabled={isCalculating}
              className="text-xs bg-amber-700 hover:bg-amber-800 text-white font-medium shrink-0 self-end sm:self-auto py-1 px-3 rounded shadow-2xs"
            >
              Recalculate Assessment
            </button>
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-100">
          <div className="text-xs text-slate-500">
            {lastEvaluatedParams && !isStale && (
              <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <CheckCircle2 size={13} />
                Assessment up to date for ₹{lastEvaluatedParams.loanAmount.toLocaleString('en-IN')} ({lastEvaluatedParams.tenureMonths} mos)
              </span>
            )}
            {isStale && (
              <span className="flex items-center gap-1.5 text-amber-700 font-medium">
                <Clock size={13} />
                Pending re-evaluation for ₹{loanAmount.toLocaleString('en-IN')}
              </span>
            )}
          </div>
          <Button
            variant="primary"
            onClick={() => runAffordabilityCheck(loanAmount, interestRate, tenureMonths, processingFee)}
            disabled={isCalculating || loanAmount <= 0 || tenureMonths <= 0}
            className={`text-xs text-white px-5 py-2 flex items-center justify-center gap-1.5 transition-colors ${
              isStale 
                ? 'bg-amber-700 hover:bg-amber-800' 
                : 'bg-teal-700 hover:bg-teal-800'
            }`}
          >
            {isCalculating ? <RefreshCw size={14} className="animate-spin" /> : <Calculator size={14} />}
            <span>{isCalculating ? 'Evaluating...' : isStale ? 'Recalculate Affordability' : 'Evaluate Affordability'}</span>
          </Button>
        </div>
      </Card>

      {/* 4. Responsible Lending Assessment (5-Second Result) */}
      {assessment && (
        <div className={`space-y-4 transition-opacity duration-200 ${isStale ? 'opacity-85' : 'opacity-100'}`}>
          {(() => {
            const verdictUI = getVerdictBadge(assessment.verdict);
            return (
              <div className={`p-4 rounded-xl border ${verdictUI.containerClass} space-y-3`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {verdictUI.icon}
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${verdictUI.tagClass}`}>
                          {verdictUI.title}
                        </span>
                        {isStale && (
                          <span className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                            Outdated (Terms changed to ₹{loanAmount.toLocaleString('en-IN')})
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">
                        {verdictUI.summaryText}
                      </h4>
                    </div>
                  </div>

                  <div className={`text-right self-end sm:self-auto bg-white/80 p-2.5 rounded-lg border shadow-2xs ${
                    isStale ? 'border-amber-300' : 'border-slate-200/60'
                  }`}>
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Estimated Monthly EMI</span>
                    <span className="text-xl font-bold text-slate-900">
                      ₹{assessment.repaymentMetrics.monthlyEmi.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      for ₹{assessment.loanParameters.loanAmount.toLocaleString('en-IN')} ({assessment.loanParameters.tenureMonths} mos)
                    </span>
                  </div>
                </div>

                {/* Plain-Language Explanation Reasons */}
                <div className="bg-white/90 p-3.5 rounded-lg border border-slate-200/70 space-y-2 text-xs">
                  <span className="font-bold text-slate-800 block">Why this decision:</span>
                  <ul className="space-y-1.5 text-slate-700">
                    {assessment.reasons.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 leading-relaxed">
                        <span className="text-teal-700 font-bold">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })()}

          {/* 5. Repayment & Disposable Buffer Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Repayment Breakdown */}
            <Card className="p-4 border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Repayment Breakdown
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Principal Borrowed</span>
                  <span className="font-semibold text-slate-800">
                    ₹{assessment.loanParameters.loanAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Annual Interest Rate</span>
                  <span className="font-semibold text-slate-800">
                    {assessment.loanParameters.annualInterestRate}% APR
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Total Interest Payable</span>
                  <span className="font-semibold text-amber-700">
                    +₹{assessment.repaymentMetrics.totalInterest.toLocaleString('en-IN')}
                  </span>
                </div>
                {assessment.loanParameters.processingFee > 0 && (
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Upfront Processing Fee</span>
                    <span className="font-semibold text-slate-800">
                      +₹{assessment.loanParameters.processingFee.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-1.5 pt-2 text-sm font-bold bg-slate-50 px-2 rounded">
                  <span className="text-slate-900">Total Repayment Amount</span>
                  <span className="text-teal-900">
                    ₹{assessment.repaymentMetrics.totalRepayment.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </Card>

            {/* Disposable Buffer & Debt Obligation (FOIR) */}
            <Card className="p-4 border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Cash Flow Buffer Impact
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Disposable Buffer Before Loan</span>
                  <span className="font-semibold text-slate-800">
                    ₹{assessment.repaymentMetrics.monthlyDisposableBeforeLoan.toLocaleString('en-IN')}/mo
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Proposed Monthly EMI Deduction</span>
                  <span className="font-semibold text-rose-600">
                    -₹{assessment.repaymentMetrics.monthlyEmi.toLocaleString('en-IN')}/mo
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Remaining Monthly Buffer</span>
                  <span className={`font-bold ${
                    assessment.repaymentMetrics.remainingFinancialBuffer >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    ₹{assessment.repaymentMetrics.remainingFinancialBuffer.toLocaleString('en-IN')}/mo
                  </span>
                </div>
                <div className="flex justify-between py-1.5 pt-2 text-xs bg-slate-50 px-2 rounded">
                  <span className="text-slate-700 font-medium">Debt-to-Income Share (FOIR)</span>
                  <span className={`font-bold ${
                    assessment.repaymentMetrics.foirPercentage > 40 ? 'text-amber-700' : 'text-slate-800'
                  }`}>
                    {assessment.repaymentMetrics.foirPercentage}% of earnings
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* 6. Lower-Income Stress Test Scenario (-25% Gig Payout Drop) */}
          <Card className="p-4 border-slate-200 space-y-2.5 bg-slate-50/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown size={16} className="text-amber-700" />
                <h4 className="text-xs font-bold text-slate-900">
                  Gig Earnings Stress Test (-25% Seasonal Payout Slump)
                </h4>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                assessment.stressTest.passesStressTest 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : 'bg-rose-100 text-rose-800'
              }`}>
                {assessment.stressTest.passesStressTest ? 'Passes Stress Test' : 'Fails Stress Test'}
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Delivery volumes fluctuate during rainy seasons, post-festival slumps, or bike repair downtime. 
              Under a 25% drop, your monthly income falls to <strong>₹{assessment.stressTest.stressIncome.toLocaleString('en-IN')}</strong>.
            </p>
            <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-600">Remaining Buffer under 25% Drop:</span>
              <span className={`font-bold text-sm ${
                assessment.stressTest.stressDisposableAfterEmi >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {assessment.stressTest.stressDisposableAfterEmi >= 0 ? '+' : ''}
                ₹{assessment.stressTest.stressDisposableAfterEmi.toLocaleString('en-IN')} / month
              </span>
            </div>
          </Card>

          {/* 7. Safer Alternatives & Save First / Delay Borrowing */}
          <Card className="p-4 border-teal-200/90 bg-gradient-to-br from-white to-teal-50/30 space-y-3">
            <div className="flex items-center gap-2 text-teal-900">
              <PiggyBank size={18} className="text-teal-700" />
              <h4 className="text-sm font-bold">Safer Alternatives &amp; Save First Option</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Safe borrowing capacity */}
              <div className="p-3 bg-white rounded-lg border border-teal-100 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Maximum Safe Monthly EMI</span>
                <div className="text-base font-bold text-teal-800">
                  ₹{assessment.saferAlternatives.safeMaxMonthlyEmi.toLocaleString('en-IN')}/mo
                </div>
                <p className="text-[11px] text-slate-500">
                  Suggested safe loan limit: ₹{assessment.saferAlternatives.safeMaxLoanAmount.toLocaleString('en-IN')}
                </p>
              </div>

              {/* Save first / delay borrowing */}
              <div className="p-3 bg-white rounded-lg border border-teal-100 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Debt-Free Savings Alternative</span>
                {assessment.saferAlternatives.saveFirstMonths ? (
                  <>
                    <div className="text-base font-bold text-emerald-700">
                      Save for {assessment.saferAlternatives.saveFirstMonths} Months
                    </div>
                    <p className="text-[11px] text-slate-600">
                      By saving your surplus buffer into a Micro-Savings Goal, you can buy outright with <strong>₹0 in interest</strong>.
                    </p>
                  </>
                ) : (
                  <p className="text-[11px] text-slate-600">
                    Focus on building a ₹3,000 emergency buffer before taking any discretionary loans.
                  </p>
                )}
              </div>
            </div>

            {/* Alternative Tenure Comparisons */}
            {assessment.saferAlternatives.tenureComparisons.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] font-semibold text-slate-700 block">
                  Compare Alternative Tenures:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  {assessment.saferAlternatives.tenureComparisons.map((c) => (
                    <div 
                      key={c.tenureMonths} 
                      className={`p-2 rounded-lg border text-[11px] ${
                        c.isViable ? 'bg-white border-slate-200' : 'bg-slate-100/60 border-slate-200 opacity-70'
                      }`}
                    >
                      <span className="font-bold text-slate-800 block">{c.tenureMonths} Months</span>
                      <span className="text-teal-800 font-semibold block">₹{c.monthlyEmi.toLocaleString('en-IN')}/mo</span>
                      <span className="text-[10px] text-slate-500 block">Interest: ₹{c.totalInterest.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* 8. Disclaimer */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center text-[11px] text-slate-500">
            {assessment.disclaimer}
          </div>
        </div>
      )}
    </div>
  );
};
