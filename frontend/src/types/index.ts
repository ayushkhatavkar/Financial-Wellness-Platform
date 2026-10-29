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

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED';
  suggestedDailySaving: number;
}

export interface RepaymentSchedule {
  id: string;
  loanName: string;
  provider: string;
  installmentAmount: number;
  dueDate: string;
  status: 'PAID' | 'DUE' | 'UPCOMING';
  principalRemaining: number;
}

export interface StatementUploadPreview {
  filename: string;
  totalRows: number;
  detectedColumns: string[];
  validRows: number;
  warningCount: number;
  sampleRows: Array<Record<string, string | number>>;
}
