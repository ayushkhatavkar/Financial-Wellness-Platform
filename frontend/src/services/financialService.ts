import { 
  User, 
  Transaction, 
  ScoreBreakdown, 
  MonthlyFinancialSummary, 
  LoanOffer, 
  SavingsGoal, 
  RepaymentSchedule, 
  StatementUploadPreview 
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';
const TOKEN_KEY = 'sahayakfin_auth_token';
const USER_KEY = 'sahayakfin_user_profile';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Set application/json only if not FormData
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    throw new ApiError('Your session has expired. Please log in again.', 401);
  }

  if (!response.ok) {
    let errorDetail = 'A network or server error occurred.';
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorDetail;
    } catch {
      // response is not JSON
    }
    throw new ApiError(errorDetail, response.status);
  }

  return response.json() as Promise<T>;
}

export const financialService = {
  // -------------------------------------------------------------
  // Auth & Session
  // -------------------------------------------------------------
  getToken: (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
  },

  getCurrentUser: (): User => {
    const saved = localStorage.getItem(USER_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    // Safe placeholder before login
    return {
      id: '',
      userCode: 'GUEST',
      fullName: 'Guest User',
      email: '',
      phone: '',
      workerType: 'DELIVERY_PARTNER',
      city: 'India',
      preferredLanguage: 'English',
      isDemo: false,
      hasConsented: false,
      registrationDate: new Date().toISOString().split('T')[0],
    };
  },

  setCurrentUser: (user: User) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  fetchCurrentUserProfile: async (): Promise<User> => {
    const profile = await request<any>('/users/me');
    const user: User = {
      id: profile.id,
      userCode: profile.user_code,
      fullName: profile.full_name,
      email: profile.email,
      phone: profile.phone || '',
      workerType: profile.worker_type,
      city: profile.city,
      preferredLanguage: profile.preferred_language,
      isDemo: profile.is_demo,
      hasConsented: profile.has_consented,
      registrationDate: profile.registration_date,
    };
    financialService.setCurrentUser(user);
    return user;
  },

  register: async (payload: {
    fullName: string;
    email: string;
    phone: string;
    workerType: string;
    city: string;
    password: string;
  }): Promise<User> => {
    const data = await request<{ access_token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        full_name: payload.fullName,
        email: payload.email,
        phone: payload.phone,
        worker_type: payload.workerType,
        city: payload.city,
        password: payload.password,
      }),
    });

    localStorage.setItem(TOKEN_KEY, data.access_token);
    return await financialService.fetchCurrentUserProfile();
  },

  login: async (email: string, password: string): Promise<User> => {
    const data = await request<{ access_token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    localStorage.setItem(TOKEN_KEY, data.access_token);
    return await financialService.fetchCurrentUserProfile();
  },

  loginDemoUser: async (userCode: string): Promise<User> => {
    const data = await request<{ access_token: string; user: any }>(`/auth/demo-login/${userCode}`, {
      method: 'POST',
    });

    localStorage.setItem(TOKEN_KEY, data.access_token);
    return await financialService.fetchCurrentUserProfile();
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  // -------------------------------------------------------------
  // Consent
  // -------------------------------------------------------------
  updateConsent: async (hasConsented: boolean): Promise<User> => {
    await request<any>('/consent', {
      method: 'POST',
      body: JSON.stringify({ has_consented: hasConsented }),
    });
    return await financialService.fetchCurrentUserProfile();
  },

  // -------------------------------------------------------------
  // Dashboard & Scores
  // -------------------------------------------------------------
  getDashboardSummary: async () => {
    return await request<any>('/dashboard/summary');
  },

  getTrustScore: async (): Promise<ScoreBreakdown> => {
    const data = await request<any>('/score/latest');
    return {
      score: data.score,
      status: data.status,
      version: data.version,
      monthsOfData: data.months_of_data,
      averageMonthlyIncome: data.average_monthly_income,
      components: data.components,
      explanation: data.explanation,
    };
  },

  getMonthlySummary: async (): Promise<MonthlyFinancialSummary[]> => {
    const summary = await request<any>('/dashboard/summary');
    return (summary.monthlySummaries || []).map((m: any) => ({
      month: m.month,
      income: m.income,
      expenses: m.expenses,
      essentialExpenses: m.essentialExpenses ?? Math.round(m.expenses * 0.5),
      businessExpenses: m.businessExpenses ?? Math.round(m.expenses * 0.35),
      otherExpenses: m.otherExpenses ?? Math.round(m.expenses * 0.15),
      savingsContributions: m.savingsContributions ?? Math.max(0, m.income - m.expenses),
      netCashFlow: m.netCashFlow ?? m.net_cash_flow ?? 0,
      closingBalance: m.closingBalance ?? m.closing_balance ?? 0,
      successfulTransactions: m.successful_transactions ?? 0,
    }));
  },

  // -------------------------------------------------------------
  // Transactions
  // -------------------------------------------------------------
  getTransactions: async (category?: string, type?: string): Promise<Transaction[]> => {
    const params = new URLSearchParams();
    if (category && category !== 'ALL') params.append('category', category);
    if (type && type !== 'ALL') params.append('transaction_type', type);

    const query = params.toString() ? `?${params.toString()}` : '';
    const data = await request<any[]>(`/transactions${query}`);

    return data.map((t: any) => ({
      id: t.id,
      userId: '',
      date: t.transaction_date,
      description: t.description,
      amount: t.amount,
      type: t.transaction_type,
      category: t.category,
      paymentMethod: t.payment_method,
      counterparty: t.counterparty,
      status: t.status,
      balance: t.balance,
      isRefund: t.is_refund,
      isDuplicateTest: t.is_duplicate_test,
    }));
  },

  updateTransactionCategory: async (id: string, category: string) => {
    return await request<any>(`/transactions/${id}/category`, {
      method: 'PATCH',
      body: JSON.stringify({ category }),
    });
  },

  // -------------------------------------------------------------
  // Statement Upload & Ingestion
  // -------------------------------------------------------------
  previewStatementCsv: async (file: File): Promise<StatementUploadPreview> => {
    const formData = new FormData();
    formData.append('file', file);

    const data = await request<any>('/statements/preview', {
      method: 'POST',
      body: formData,
    });

    return {
      filename: data.filename,
      totalRows: data.total_rows,
      detectedColumns: data.detected_columns,
      validRows: data.valid_rows,
      warningCount: data.warning_count,
      sampleRows: data.sample_rows,
    };
  },

  commitStatementImport: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    return await request<any>('/statements/import', {
      method: 'POST',
      body: formData,
    });
  },

  // -------------------------------------------------------------
  // Loan Offers & Applications
  // -------------------------------------------------------------
  getLoanOffers: async (): Promise<LoanOffer[]> => {
    const data = await request<any[]>('/offers');
    return data.map((o: any) => ({
      id: o.id,
      name: o.name,
      provider: o.provider,
      minAmount: o.min_amount,
      maxAmount: o.max_amount,
      interestRate: o.interest_rate,
      tenureMonths: o.tenure_months,
      processingFee: 150,
      processingFeeType: 'FLAT',
      repaymentMethod: o.repayment_method,
      eligibilityRule: o.eligibility_rule,
      isEligible: o.is_eligible,
      simulated: o.simulated,
      disclaimer: o.disclaimer,
    }));
  },

  applyLoanOffer: async (offerId: string, requestedAmount: number) => {
    return await request<any>('/offers/apply', {
      method: 'POST',
      body: JSON.stringify({
        offer_id: offerId,
        requested_amount: requestedAmount,
      }),
    });
  },

  // -------------------------------------------------------------
  // Savings Goals
  // -------------------------------------------------------------
  getSavingsGoals: async (): Promise<SavingsGoal[]> => {
    const data = await request<any[]>('/savings-goals');
    return data.map((g: any) => ({
      id: g.id,
      name: g.goal_name,
      targetAmount: g.target_amount,
      currentAmount: g.current_amount,
      targetDate: g.target_date,
      status: g.status,
      suggestedDailySaving: g.suggested_daily_saving,
    }));
  },

  createSavingsGoal: async (goal: {
    name: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: string;
  }): Promise<SavingsGoal> => {
    const data = await request<any>('/savings-goals', {
      method: 'POST',
      body: JSON.stringify({
        goal_name: goal.name,
        target_amount: goal.targetAmount,
        current_amount: goal.currentAmount,
        target_date: goal.targetDate,
      }),
    });

    return {
      id: data.id,
      name: data.goal_name,
      targetAmount: data.target_amount,
      currentAmount: data.current_amount,
      targetDate: data.target_date,
      status: data.status,
      suggestedDailySaving: data.suggested_daily_saving,
    };
  },

  // -------------------------------------------------------------
  // Repayments
  // -------------------------------------------------------------
  getRepayments: async (): Promise<RepaymentSchedule[]> => {
    const data = await request<any[]>('/repayments');
    return data.map((r: any) => ({
      id: r.id,
      loanName: r.loan_name,
      provider: r.provider,
      installmentAmount: r.installment_amount,
      dueDate: r.due_date,
      status: r.status,
      principalRemaining: r.principal_remaining,
    }));
  },
};
