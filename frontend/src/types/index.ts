export type WorkerType = 
  | 'DELIVERY_PARTNER'
  | 'CAB_DRIVER'
  | 'FREELANCER'
  | 'STREET_VENDOR'
  | 'HOME_SERVICES'
  | 'MICRO_RETAILER';

export interface User {
  id: string;
  userCode: string;
  fullName: string;
  email: string;
  phone: string;
  workerType: WorkerType;
  city: string;
  preferredLanguage: string;
  isDemo: boolean;
  hasConsented: boolean;
  registrationDate: string;
}

export type TransactionType = 'CREDIT' | 'DEBIT';
export type TransactionStatus = 'SUCCESS' | 'PENDING' | 'FAILED';

export interface Transaction {
  id: string;
  userId: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  paymentMethod: string;
  counterparty: string;
  status: TransactionStatus;
  balance?: number;
  isRefund?: boolean;
  isDuplicateTest?: boolean;
  is_excluded_from_scoring?: boolean;
  exclusion_reason?: string;
  fraud_review_status?: string;
  fraud_risk_score?: number;
}

export interface ScoreBreakdown {
  score: number | null;
  status: 'SUFFICIENT' | 'PROVISIONAL_2_MONTHS' | 'INSUFFICIENT_DATA' | 'PROVISIONAL_NO_BILL_DATA';
  version: string;
  monthsOfData: number;
  averageMonthlyIncome: number;
  components: {
    incomeStability: {
      score: number | null;
      weight: number;
      label: string;
      description: string;
      impact: 'positive' | 'neutral' | 'negative';
      tips: string;
    };
    savingsConsistency: {
      score: number | null;
      weight: number;
      label: string;
      description: string;
      impact: 'positive' | 'neutral' | 'negative';
      tips: string;
    };
    expenseHealth: {
      score: number | null;
      weight: number;
      label: string;
      description: string;
      impact: 'positive' | 'neutral' | 'negative';
      tips: string;
    };
    billPaymentConsistency: {
      score: number | null;
      weight: number;
      label: string;
      description: string;
      impact: 'positive' | 'neutral' | 'negative';
      tips: string;
    };
  };
  explanation: string;
}

export interface MonthlyFinancialSummary {
  month: string;
  income: number;
  expenses: number;
  essentialExpenses: number;
  businessExpenses: number;
  otherExpenses: number;
  savingsContributions: number;
  netCashFlow: number;
  closingBalance: number;
  successfulTransactions: number;
}

export interface LoanOffer {
  id: string;
  name: string;
  provider: string;
  minAmount: number;
  maxAmount: number;
  interestRate: number; // annual %
  tenureMonths: number;
  processingFee: number;
  processingFeeType: string;
  repaymentMethod: string;
  eligibilityRule: string;
  isEligible: boolean;
  simulated: boolean;
  disclaimer: string;
}

export interface SavingsContribution {
  id: string;
  goalId: string;
  amount: number;
  contributionDate: string;
  note?: string;
  createdAt: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  remainingAmount?: number;
  progressPercentage?: number;
  targetDate: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED';
  suggestedDailySaving: number;
  contributions?: SavingsContribution[];
}

export interface PaymentRecord {
  id: string;
  repaymentId: string;
  amountPaid: number;
  paymentDate: string;
  paymentMethod: string;
  notes?: string;
  createdAt: string;
}

export interface RepaymentSchedule {
  id: string;
  facilityType?: 'LOAN' | 'BILL';
  loanName: string;
  provider: string;
  installmentAmount: number;
  dueDate: string;
  status: 'PAID' | 'DUE' | 'UPCOMING' | 'OVERDUE';
  principalRemaining: number;
  totalPrincipal?: number | null;
  isRecurring?: boolean;
  frequency?: string;
  notes?: string;
  urgency?: 'OVERDUE' | 'DUE_SOON' | 'UPCOMING' | 'SETTLED';
  payments?: PaymentRecord[];
}

export interface CategorySpendingItem {
  category: string;
  categoryLabel: string;
  currentMonthlySpend: number;
  percentageOfExpenses: number;
  percentageOfIncome: number;
  monthlyTrend: 'INCREASING' | 'STABLE' | 'DECREASING';
  isOpportunity: boolean;
  suggestedMonthlyLimit?: number | null;
  potentialMonthlySavings?: number | null;
  opportunityExplanation?: string | null;
  needsReview?: boolean;
}

export interface SpendingAnalysis {
  monthsAnalyzed: number;
  isSufficient: boolean;
  sufficiencyNote: string;
  averageMonthlyIncome: number;
  averageMonthlyExpenses: number;
  netMonthlySavings: number;
  savingsRatePct: number;
  categoryBreakdown: CategorySpendingItem[];
  potentialTotalMonthlySavings: number;
  potentialTotalAnnualSavings: number;
  reportingPeriodLabel?: string;
}

export interface BudgetRecommendation {
  id: string;
  category: string;
  categoryLabel: string;
  currentMonthlySpend: number;
  suggestedMonthlyLimit: number;
  expectedMonthlySavings: number;
  expectedAnnualSavings: number;
  reason: string;
  status: 'PENDING' | 'ACCEPTED' | 'DISMISSED';
  linkedGoalId?: string | null;
  linkedGoalName?: string | null;
  actualCurrentSpend: number;
  isOverBudget: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  language: string;
  createdAt: string;
  isAiPowered?: boolean;
  providerUsed?: string;
  suggestedFollowups?: string[];
}

export interface StatementUploadPreview {
  filename: string;
  totalRows: number;
  detectedColumns: string[];
  validRows: number;
  warningCount: number;
  sampleRows: Array<Record<string, string | number>>;
  integrity_report?: IntegrityReport;
  parsed_records?: Array<{
    row_number: number;
    ref_id?: string;
    transaction_date: string;
    description: string;
    amount: number;
    transaction_type: string;
    category: string;
    counterparty?: string;
    is_flagged?: boolean;
    is_excluded_from_scoring?: boolean;
  }>;
}

// FraudShield Integrity & Fake Transaction Detection Types
export interface FraudAlert {
  id?: string;
  rule_id: string;
  rule_name: string;
  category: 'DUPLICATE' | 'CIRCULAR_TRANSFER' | 'INCOME_SPIKE' | 'SELF_TRANSFER' | 'SUSPICIOUS_REPETITION' | string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  explanation: string;
  evidence: Record<string, any>;
  affected_indices?: number[];
  external_ref?: string;
  review_status: 'PENDING_REVIEW' | 'CONFIRMED_INVALID' | 'CLEARED';
  review_notes?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  created_at?: string;
}

export interface IntegrityReport {
  overall_status: 'CLEAR' | 'REVIEW_RECOMMENDED' | 'INSUFFICIENT_DATA' | string;
  total_analyzed: number;
  flagged_count: number;
  anomaly_score: number;
  category_counts: Record<string, number>;
  alerts: FraudAlert[];
  summary_notes: string;
  run_id?: string;
  created_at?: string;
}

export interface DemoFraudSample {
  sample_type: string;
  filename: string;
  csv_content: string;
  description: string;
}

// Debt-Trap Prevention & Loan Affordability types
export interface AffordabilityBaseline {
  userId: string;
  isSufficient: boolean;
  monthsAnalyzed: number;
  transactionsAnalyzed: number;
  averageMonthlyIncome: number;
  conservativeMonthlyIncome: number;
  incomeVariabilityCv: number;
  essentialLivingExpenses: number;
  necessaryBusinessExpenses: number;
  existingLoanCommitments: number;
  upcomingBills: number;
  currentSavingsBuffer: number;
  totalMonthlyOutflows: number;
  disposableIncomeBeforeLoan: number;
  conservativeDisposableBeforeLoan: number;
}

export interface LoanAffordabilityRequest {
  loanAmount: number;
  annualInterestRate: number;
  tenureMonths: number;
  processingFee?: number;
}

export interface TenureComparison {
  tenureMonths: number;
  monthlyEmi: number;
  totalInterest: number;
  totalRepayment: number;
  monthlyDisposableAfterEmi: number;
  isViable: boolean;
}

export interface LoanAffordabilityResult {
  verdict: 'LIKELY_AFFORDABLE' | 'PROCEED_WITH_CAUTION' | 'NOT_AFFORDABLE' | 'INSUFFICIENT_DATA';
  reasons: string[];
  loanParameters: {
    loanAmount: number;
    annualInterestRate: number;
    tenureMonths: number;
    processingFee: number;
  };
  repaymentMetrics: {
    monthlyEmi: number;
    totalInterest: number;
    totalRepayment: number;
    monthlyDisposableBeforeLoan: number;
    monthlyDisposableAfterEmi: number;
    remainingFinancialBuffer: number;
    totalDebtCommitments: number;
    foirPercentage: number;
  };
  stressTest: {
    stressIncome: number;
    stressDisposableAfterEmi: number;
    stressFoirPercentage: number;
    passesStressTest: boolean;
  };
  userFinancialProfile: AffordabilityBaseline;
  saferAlternatives: {
    safeMaxMonthlyEmi: number;
    safeMaxLoanAmount: number;
    tenureComparisons: TenureComparison[];
    saveFirstMonths: number | null;
    recommendSavingFirst: boolean;
  };
  disclaimer: string;
}
