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
          icon: <CheckCircle2 size={24} className="text-[#16865C] shrink-0" />,
          title: 'Likely Affordable',
          tagClass: 'bg-[#EDF8F3] text-[#16865C] border-[#BDE8D3]',
          containerClass: 'bg-[#EDF8F3]/60 border-[#BDE8D3]',
          summaryText: 'This loan comfortably fits within your verified monthly surplus and passes the seasonal drop stress test.'
        };
      case 'PROCEED_WITH_CAUTION':
        return {
          icon: <AlertTriangle size={24} className="text-[#D18A22] shrink-0" />,
          title: 'Proceed with Caution',
          tagClass: 'bg-[#FEF9EC] text-[#D18A22] border-[#EBCB87]',
          containerClass: 'bg-[#FEF9EC]/60 border-[#EBCB87]',
          summaryText: 'Manageable in normal months, but a seasonal monsoon dip or delivery slow-down could cause cash shortages.'
        };
      case 'NOT_AFFORDABLE':
        return {
          icon: <XCircle size={24} className="text-[#D94B4B] shrink-0" />,
          title: 'Not Affordable with Current Finances',
          tagClass: 'bg-[#FDF1F1] text-[#D94B4B] border-[#F9D0D0]',
          containerClass: 'bg-[#FDF1F1]/70 border-[#F9D0D0]',
          summaryText: 'High risk of debt trap. The proposed EMI creates a cash deficit or consumes over 50% of your earnings.'
        };
      default:
        return {
          icon: <HelpCircle size={24} className="text-[#687080] shrink-0" />,
          title: 'Insufficient Data to Assess',
          tagClass: 'bg-[#F0F2F5] text-[#687080] border-[#E5E7EB]',
          containerClass: 'bg-[#F7F8FA] border-[#E5E7EB]',
          summaryText: 'A minimum of 60 days of verified transaction statements is required for borrowing capacity modeling.'
        };
    }
  };

  const presets = [10000, 25000, 50000, 100000, 300000];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* 1. Page Header */}
      <PageHeader
        title="Debt-Trap Prevention & Loan Affordability"
        description="Model and stress-test your repayment capacity against verified cash flows before borrowing."
      />

      {/* 2. User's Financial Position Review Cards */}
      {baseline && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs text-[#687080] px-0.5">
            <span className="font-bold text-[#171B26] flex items-center gap-1.5">
              <Calculator size={15} className="text-[#F28C28]" />
              Your Verified Cash Flow Position
            </span>
            <span className="text-[11px] text-[#9299A5] font-mono-num">
              Based on {baseline.monthsAnalyzed} month(s) of statements
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <Card hoverEffect className="p-4 bg-white">
              <span className="text-[10px] text-[#687080] block uppercase font-bold tracking-wider">Monthly Inflow</span>
              <span className="text-xl font-bold text-[#171B26] font-mono-num block mt-1">
                ₹{baseline.averageMonthlyIncome.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-[#9299A5] block mt-0.5 font-mono-num">
                Conservative: ₹{baseline.conservativeMonthlyIncome.toLocaleString('en-IN')}
              </span>
            </Card>

            <Card hoverEffect className="p-4 bg-white">
              <span className="text-[10px] text-[#687080] block uppercase font-bold tracking-wider">Living &amp; Work Costs</span>
              <span className="text-xl font-bold text-[#171B26] font-mono-num block mt-1">
                ₹{(baseline.essentialLivingExpenses + baseline.necessaryBusinessExpenses).toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-[#9299A5] block mt-0.5">
                Food, bills, fuel &amp; servicing
              </span>
            </Card>

            <Card hoverEffect className="p-4 bg-white">
              <span className="text-[10px] text-[#687080] block uppercase font-bold tracking-wider">Existing Debt &amp; Bills</span>
              <span className="text-xl font-bold text-[#171B26] font-mono-num block mt-1">
                ₹{(baseline.existingLoanCommitments + baseline.upcomingBills).toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-[#9299A5] block mt-0.5 font-mono-num">
                {baseline.existingLoanCommitments > 0 ? `Active: ₹${baseline.existingLoanCommitments}` : 'No active loans'}
              </span>
            </Card>

            <Card hoverEffect className="p-4 bg-[#FFF5EB] border-[#F28C28]/25">
              <span className="text-[10px] text-[#F28C28] block uppercase font-bold tracking-wider">Pre-Loan Surplus Buffer</span>
              <span className={`text-xl font-bold font-mono-num block mt-1 ${
                baseline.disposableIncomeBeforeLoan >= 0 ? 'text-[#171B26]' : 'text-[#D94B4B]'
              }`}>
                ₹{baseline.disposableIncomeBeforeLoan.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-[#687080] block mt-0.5">
                Available surplus buffer
              </span>
            </Card>
          </div>
        </div>
      )}

      {/* 3. Interactive Loan Affordability Calculator */}
      <Card className="p-6 border-[#E5E7EB] bg-white space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E5E7EB] pb-3.5 gap-2">
          <div>
            <h3 className="text-base font-bold text-[#171B26]">Enter Proposed Loan Terms</h3>
            <p className="text-xs text-[#687080]">
              Test any loan, emergency borrowing, or two-wheeler EMI against your actual income.
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-[#9299A5]">Presets:</span>
            {presets.map((p) => (
              <button
                key={p}
                onClick={() => handlePresetSelect(p)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors cursor-pointer font-mono-num ${
                  loanAmount === p 
                    ? 'bg-[#F28C28] text-white border-[#F28C28] font-bold shadow-xs' 
                    : 'bg-[#F0F2F5] text-[#171B26] border-[#E5E7EB] hover:bg-[#E5E7EB]'
                }`}
              >
                ₹{(p / 1000).toFixed(0)}k
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 text-xs">
          <div>
            <label className="font-semibold text-[#171B26] block mb-1">
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
            <label className="font-semibold text-[#171B26] block mb-1">
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
            <span className="text-[10px] text-[#9299A5] mt-1 block">0% for interest-free loans</span>
          </div>

          <div>
            <label className="font-semibold text-[#171B26] block mb-1">
              Tenure (Months)
            </label>
            <select
              value={tenureMonths}
              onChange={(e) => setTenureMonths(Number(e.target.value))}
              className="w-full text-xs p-2.5 bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28C28]/20 focus:border-[#F28C28] text-[#171B26]"
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
            <label className="font-semibold text-[#171B26] block mb-1">
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
          <div className="text-xs text-[#D94B4B] bg-[#FDF1F1] p-3 rounded-lg border border-[#F9D0D0] flex items-center justify-between">
            <span>{calcError}</span>
            <button 
              onClick={() => runAffordabilityCheck(loanAmount, interestRate, tenureMonths, processingFee)}
              className="text-[#D94B4B] font-bold underline hover:no-underline ml-2 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {isStale && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 bg-[#FEF9EC] border border-[#EBCB87] rounded-lg text-xs text-[#D18A22]">
            <div className="flex items-center gap-2">
              <AlertTriangle size={17} className="text-[#D18A22] shrink-0" />
              <span>
                <strong>Parameters modified:</strong> Form currently set to 
                ₹{loanAmount.toLocaleString('en-IN')} ({tenureMonths} mos @ {interestRate}% APR). 
                The assessment below reflects prior inputs.
              </span>
            </div>
            <button
              onClick={() => runAffordabilityCheck(loanAmount, interestRate, tenureMonths, processingFee)}
              disabled={isCalculating}
              className="text-xs bg-[#D18A22] hover:bg-[#B77619] text-white font-medium shrink-0 self-end sm:self-auto py-1.5 px-3.5 rounded-full cursor-pointer"
            >
              Recalculate Assessment
            </button>
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#E5E7EB]">
          <div className="text-xs text-[#687080]">
            {lastEvaluatedParams && !isStale && (
              <span className="flex items-center gap-1.5 text-[#16865C] font-semibold font-mono-num">
                <CheckCircle2 size={14} />
                Calculated for ₹{lastEvaluatedParams.loanAmount.toLocaleString('en-IN')} ({lastEvaluatedParams.tenureMonths} mos @ {lastEvaluatedParams.interestRate}% APR)
              </span>
            )}
            {isStale && (
              <span className="flex items-center gap-1.5 text-[#D18A22] font-semibold">
                <Clock size={14} />
                Pending re-evaluation for ₹{loanAmount.toLocaleString('en-IN')}
              </span>
            )}
          </div>
          <Button
            variant="primary"
            onClick={() => runAffordabilityCheck(loanAmount, interestRate, tenureMonths, processingFee)}
            disabled={isCalculating || loanAmount <= 0 || tenureMonths <= 0}
            className="text-xs font-semibold"
          >
            {isCalculating ? <RefreshCw size={14} className="animate-spin" /> : <Calculator size={14} />}
            <span>{isCalculating ? 'Evaluating...' : isStale ? 'Recalculate Affordability' : 'Evaluate Affordability'}</span>
          </Button>
        </div>
      </Card>

      {/* 4. Responsible Lending Assessment */}
      {assessment && (
        <div className={`space-y-4 transition-opacity duration-200 ${isStale ? 'opacity-85' : 'opacity-100'}`}>
          {(() => {
            const verdictUI = getVerdictBadge(assessment.verdict);
            return (
              <div className={`p-5 rounded-xl border ${verdictUI.containerClass} space-y-3.5`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    {verdictUI.icon}
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`inline-block text-xs font-bold px-3 py-0.5 rounded-full border ${verdictUI.tagClass}`}>
                          {verdictUI.title}
                        </span>
                        {isStale && (
                          <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FEF9EC] text-[#D18A22] border border-[#EBCB87]">
                            Outdated Terms
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm sm:text-base font-bold text-[#171B26] leading-snug">
                        {verdictUI.summaryText}
                      </h4>
                    </div>
                  </div>

                  <div className="text-right self-end sm:self-auto bg-white p-3 rounded-lg border border-[#E5E7EB] shadow-xs">
                    <span className="text-[10px] text-[#687080] block uppercase font-bold tracking-wider">Estimated Monthly EMI</span>
                    <span className="text-2xl font-bold font-mono-num text-[#171B26]">
                      ₹{assessment.repaymentMetrics.monthlyEmi.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-[#9299A5] block font-mono-num mt-0.5">
                      for ₹{assessment.loanParameters.loanAmount.toLocaleString('en-IN')} ({assessment.loanParameters.tenureMonths} mos)
                    </span>
                  </div>
                </div>

                {/* Plain-Language Explanation Reasons */}
                <div className="bg-white p-4 rounded-lg border border-[#E5E7EB] space-y-2 text-xs">
                  <span className="font-bold text-[#171B26] block text-xs uppercase tracking-wider">Analysis Factors:</span>
                  <ul className="space-y-1.5 text-[#171B26]">
                    {assessment.reasons.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 leading-relaxed">
                        <span className="text-[#F28C28] font-bold">•</span>
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
            <Card className="p-5 border-[#E5E7EB] bg-white space-y-3">
              <h4 className="text-xs font-bold text-[#171B26] uppercase tracking-wider">
                Repayment Breakdown
              </h4>
              <div className="space-y-2 text-xs font-mono-num">
                <div className="flex justify-between py-1.5 border-b border-[#E5E7EB]">
                  <span className="text-[#687080] font-sans">Principal Borrowed</span>
                  <span className="font-bold text-[#171B26]">
                    ₹{assessment.loanParameters.loanAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#E5E7EB]">
                  <span className="text-[#687080] font-sans">Annual Interest Rate</span>
                  <span className="font-bold text-[#171B26]">
                    {assessment.loanParameters.annualInterestRate}% APR
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#E5E7EB]">
                  <span className="text-[#687080] font-sans">Total Interest Payable</span>
                  <span className="font-bold text-[#D18A22]">
                    +₹{assessment.repaymentMetrics.totalInterest.toLocaleString('en-IN')}
                  </span>
                </div>
                {assessment.loanParameters.processingFee > 0 && (
                  <div className="flex justify-between py-1.5 border-b border-[#E5E7EB]">
                    <span className="text-[#687080] font-sans">Upfront Processing Fee</span>
                    <span className="font-bold text-[#171B26]">
                      +₹{assessment.loanParameters.processingFee.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-2 pt-2 text-sm font-bold bg-[#F0F2F5] px-3 rounded-lg">
                  <span className="text-[#171B26] font-sans">Total Repayment Amount</span>
                  <span className="text-[#171B26]">
                    ₹{assessment.repaymentMetrics.totalRepayment.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </Card>

            {/* Disposable Buffer & Debt Obligation (FOIR) */}
            <Card className="p-5 border-[#E5E7EB] bg-white space-y-3">
              <h4 className="text-xs font-bold text-[#171B26] uppercase tracking-wider">
                Cash Flow Buffer Impact
              </h4>
              <div className="space-y-2 text-xs font-mono-num">
                <div className="flex justify-between py-1.5 border-b border-[#E5E7EB]">
                  <span className="text-[#687080] font-sans">Disposable Buffer Before Loan</span>
                  <span className="font-bold text-[#171B26]">
                    ₹{assessment.repaymentMetrics.monthlyDisposableBeforeLoan.toLocaleString('en-IN')}/mo
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#E5E7EB]">
                  <span className="text-[#687080] font-sans">Proposed Monthly EMI Deduction</span>
                  <span className="font-bold text-[#D94B4B]">
                    -₹{assessment.repaymentMetrics.monthlyEmi.toLocaleString('en-IN')}/mo
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#E5E7EB]">
                  <span className="text-[#687080] font-sans">Remaining Monthly Buffer</span>
                  <span className={`font-bold ${
                    assessment.repaymentMetrics.remainingFinancialBuffer >= 0 ? 'text-[#16865C]' : 'text-[#D94B4B]'
                  }`}>
                    ₹{assessment.repaymentMetrics.remainingFinancialBuffer.toLocaleString('en-IN')}/mo
                  </span>
                </div>
                <div className="flex justify-between py-2 pt-2 text-xs bg-[#F0F2F5] px-3 rounded-lg">
                  <span className="text-[#171B26] font-sans font-semibold">Debt-to-Income Share (FOIR)</span>
                  <span className={`font-bold ${
                    assessment.repaymentMetrics.foirPercentage > 40 ? 'text-[#D18A22]' : 'text-[#171B26]'
                  }`}>
                    {assessment.repaymentMetrics.foirPercentage}% of earnings
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* 6. Lower-Income Stress Test Scenario */}
          <Card className="p-5 border-[#E5E7EB] space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown size={18} className="text-[#D18A22]" />
                <h4 className="text-sm font-bold text-[#171B26]">
                  Gig Earnings Stress Test (-25% Seasonal Payout Slump)
                </h4>
              </div>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                assessment.stressTest.passesStressTest 
                  ? 'bg-[#EDF8F3] text-[#16865C] border border-[#BDE8D3]' 
                  : 'bg-[#FDF1F1] text-[#D94B4B] border border-[#F9D0D0]'
              }`}>
                {assessment.stressTest.passesStressTest ? 'Passes Stress Test' : 'Fails Stress Test'}
              </span>
            </div>
            <p className="text-xs text-[#687080] leading-relaxed">
              Delivery volumes fluctuate during rainy seasons, post-festival slumps, or bike repair downtime. 
              Under a 25% drop, your monthly income falls to <strong className="text-[#171B26] font-mono-num">₹{assessment.stressTest.stressIncome.toLocaleString('en-IN')}</strong>.
            </p>
            <div className="p-3 bg-[#F7F8FA] rounded-lg border border-[#E5E7EB] flex justify-between items-center text-xs font-mono-num">
              <span className="text-[#687080] font-sans">Remaining Buffer under 25% Slump:</span>
              <span className={`font-bold text-sm ${
                assessment.stressTest.stressDisposableAfterEmi >= 0 ? 'text-[#16865C]' : 'text-[#D94B4B]'
              }`}>
                {assessment.stressTest.stressDisposableAfterEmi >= 0 ? '+' : ''}
                ₹{assessment.stressTest.stressDisposableAfterEmi.toLocaleString('en-IN')} / month
              </span>
            </div>
          </Card>

          {/* 7. Safer Alternatives & Save First Option */}
          <Card className="p-5 border-[#E5E7EB] bg-white space-y-4">
            <div className="flex items-center gap-2 text-[#171B26]">
              <PiggyBank size={20} className="text-[#F28C28]" />
              <h4 className="text-base font-bold">Safer Alternatives &amp; Save-First Alternative</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              {/* Safe borrowing capacity */}
              <div className="p-4 bg-[#F7F8FA] rounded-lg border border-[#E5E7EB] space-y-1">
                <span className="text-[10px] text-[#687080] uppercase font-bold tracking-wider">Maximum Safe Monthly EMI</span>
                <div className="text-xl font-bold font-mono-num text-[#171B26]">
                  ₹{assessment.saferAlternatives.safeMaxMonthlyEmi.toLocaleString('en-IN')}/mo
                </div>
                <p className="text-[11px] text-[#687080] font-mono-num mt-1">
                  Suggested safe loan ceiling: ₹{assessment.saferAlternatives.safeMaxLoanAmount.toLocaleString('en-IN')}
                </p>
              </div>

              {/* Save first / delay borrowing */}
              <div className="p-4 bg-[#FFF5EB] rounded-lg border border-[#F28C28]/25 space-y-1">
                <span className="text-[10px] text-[#F28C28] uppercase font-bold tracking-wider">Debt-Free Savings Alternative</span>
                {assessment.saferAlternatives.saveFirstMonths ? (
                  <>
                    <div className="text-xl font-bold font-mono-num text-[#16865C]">
                      Save for {assessment.saferAlternatives.saveFirstMonths} Months
                    </div>
                    <p className="text-[11px] text-[#687080] leading-relaxed mt-1">
                      By saving your surplus buffer into a Micro-Savings Goal, you can purchase outright with <strong className="text-[#171B26]">₹0 in interest charges</strong>.
                    </p>
                  </>
                ) : (
                  <p className="text-[11px] text-[#687080]">
                    Focus on building a ₹3,000 emergency buffer before taking discretionary loans.
                  </p>
                )}
              </div>
            </div>

            {/* Alternative Tenure Comparisons */}
            {assessment.saferAlternatives.tenureComparisons.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-[#171B26] block">
                  Compare Alternative Tenures:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs font-mono-num">
                  {assessment.saferAlternatives.tenureComparisons.map((c) => (
                    <div 
                      key={c.tenureMonths} 
                      className={`p-3 rounded-lg border ${
                        c.isViable ? 'bg-white border-[#E5E7EB]' : 'bg-[#F0F2F5] border-[#E5E7EB] opacity-65'
                      }`}
                    >
                      <span className="font-bold text-[#171B26] block font-sans">{c.tenureMonths} Months</span>
                      <span className="text-[#F28C28] font-bold block mt-0.5">₹{c.monthlyEmi.toLocaleString('en-IN')}/mo</span>
                      <span className="text-[10px] text-[#687080] block mt-0.5">Interest: ₹{c.totalInterest.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* 8. Disclaimer */}
          <div className="p-3.5 bg-[#F0F2F5] rounded-lg border border-[#E5E7EB] text-center text-xs text-[#687080]">
            {assessment.disclaimer}
          </div>
        </div>
      )}
    </div>
  );
};
