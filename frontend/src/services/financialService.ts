import { 
  User, 
  Transaction, 
  ScoreBreakdown, 
  MonthlyFinancialSummary, 
  LoanOffer, 
  SavingsGoal, 
  SavingsContribution,
  RepaymentSchedule, 
  StatementUploadPreview,
  SpendingAnalysis,
  BudgetRecommendation,
  ChatMessage,
  AffordabilityBaseline,
  LoanAffordabilityRequest,
  LoanAffordabilityResult,
  FraudAlert,
  IntegrityReport,
  DemoFraudSample 
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
      is_excluded_from_scoring: t.is_excluded_from_scoring,
      exclusion_reason: t.exclusion_reason,
      fraud_review_status: t.fraud_review_status,
      fraud_risk_score: t.fraud_risk_score,
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
      integrity_report: data.integrity_report,
      parsed_records: data.parsed_records,
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
  // FraudShield — Financial Data Integrity
  // -------------------------------------------------------------
  getLatestFraudReport: async (): Promise<IntegrityReport> => {
    return await request<IntegrityReport>('/fraud/report/latest');
  },

  getFraudAlerts: async (params?: { category?: string; severity?: string; review_status?: string }): Promise<FraudAlert[]> => {
    const q = new URLSearchParams();
    if (params?.category && params.category !== 'ALL') q.append('category', params.category);
    if (params?.severity && params.severity !== 'ALL') q.append('severity', params.severity);
    if (params?.review_status && params.review_status !== 'ALL') q.append('review_status', params.review_status);

    const queryStr = q.toString() ? `?${q.toString()}` : '';
    return await request<FraudAlert[]>(`/fraud/alerts${queryStr}`);
  },

  reviewFraudAlert: async (
    alertId: string,
    payload: { review_status: string; review_notes?: string; exclude_from_scoring?: boolean }
  ): Promise<FraudAlert> => {
    return await request<FraudAlert>(`/fraud/alerts/${alertId}/review`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  getFraudDemoSample: async (sampleType: 'normal' | 'suspicious' | 'corrected'): Promise<DemoFraudSample> => {
    return await request<DemoFraudSample>(`/fraud/demo-samples/${sampleType}`);
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
  // Debt-Trap Prevention & Loan Affordability
  // -------------------------------------------------------------
  getLoanAffordabilityBaseline: async (): Promise<AffordabilityBaseline> => {
    const data = await request<any>('/loans/affordability-baseline');
    return {
      userId: data.user_id,
      isSufficient: data.is_sufficient,
      monthsAnalyzed: data.months_analyzed,
      transactionsAnalyzed: data.transactions_analyzed,
      averageMonthlyIncome: data.average_monthly_income,
      conservativeMonthlyIncome: data.conservative_monthly_income,
      incomeVariabilityCv: data.income_variability_cv,
      essentialLivingExpenses: data.essential_living_expenses,
      necessaryBusinessExpenses: data.necessary_business_expenses,
      existingLoanCommitments: data.existing_loan_commitments,
      upcomingBills: data.upcoming_bills,
      currentSavingsBuffer: data.current_savings_buffer,
      totalMonthlyOutflows: data.total_monthly_outflows,
      disposableIncomeBeforeLoan: data.disposable_income_before_loan,
      conservativeDisposableBeforeLoan: data.conservative_disposable_before_loan,
    };
  },

  checkLoanAffordability: async (payload: LoanAffordabilityRequest): Promise<LoanAffordabilityResult> => {
    const data = await request<any>('/loans/affordability-check', {
      method: 'POST',
      body: JSON.stringify({
        loan_amount: payload.loanAmount,
        annual_interest_rate: payload.annualInterestRate,
        tenure_months: payload.tenureMonths,
        processing_fee: payload.processingFee || 0.0,
      }),
    });
    return {
      verdict: data.verdict,
      reasons: data.reasons || [],
      loanParameters: {
        loanAmount: data.loan_parameters.loan_amount,
        annualInterestRate: data.loan_parameters.annual_interest_rate,
        tenureMonths: data.loan_parameters.tenure_months,
        processingFee: data.loan_parameters.processing_fee,
      },
      repaymentMetrics: {
        monthlyEmi: data.repayment_metrics.monthly_emi,
        totalInterest: data.repayment_metrics.total_interest,
        totalRepayment: data.repayment_metrics.total_repayment,
        monthlyDisposableBeforeLoan: data.repayment_metrics.monthly_disposable_before_loan,
        monthlyDisposableAfterEmi: data.repayment_metrics.monthly_disposable_after_emi,
        remainingFinancialBuffer: data.repayment_metrics.remaining_financial_buffer,
        totalDebtCommitments: data.repayment_metrics.total_debt_commitments,
        foirPercentage: data.repayment_metrics.foir_percentage,
      },
      stressTest: {
        stressIncome: data.stress_test.stress_income,
        stressDisposableAfterEmi: data.stress_test.stress_disposable_after_emi,
        stressFoirPercentage: data.stress_test.stress_foir_percentage,
        passesStressTest: data.stress_test.passes_stress_test,
      },
      userFinancialProfile: {
        userId: data.user_financial_profile.user_id,
        isSufficient: data.user_financial_profile.is_sufficient,
        monthsAnalyzed: data.user_financial_profile.months_analyzed,
        transactionsAnalyzed: data.user_financial_profile.transactions_analyzed,
        averageMonthlyIncome: data.user_financial_profile.average_monthly_income,
        conservativeMonthlyIncome: data.user_financial_profile.conservative_monthly_income,
        incomeVariabilityCv: data.user_financial_profile.income_variability_cv,
        essentialLivingExpenses: data.user_financial_profile.essential_living_expenses,
        necessaryBusinessExpenses: data.user_financial_profile.necessary_business_expenses,
        existingLoanCommitments: data.user_financial_profile.existing_loan_commitments,
        upcomingBills: data.user_financial_profile.upcoming_bills,
        currentSavingsBuffer: data.user_financial_profile.current_savings_buffer,
        totalMonthlyOutflows: data.user_financial_profile.total_monthly_outflows,
        disposableIncomeBeforeLoan: data.user_financial_profile.disposable_income_before_loan,
        conservativeDisposableBeforeLoan: data.user_financial_profile.conservative_disposable_before_loan,
      },
      saferAlternatives: {
        safeMaxMonthlyEmi: data.safer_alternatives.safe_max_monthly_emi,
        safeMaxLoanAmount: data.safer_alternatives.safe_max_loan_amount,
        tenureComparisons: (data.safer_alternatives.tenure_comparisons || []).map((t: any) => ({
          tenureMonths: t.tenure_months,
          monthlyEmi: t.monthly_emi,
          totalInterest: t.total_interest,
          totalRepayment: t.total_repayment,
          monthlyDisposableAfterEmi: t.monthly_disposable_after_emi,
          isViable: t.is_viable,
        })),
        saveFirstMonths: data.safer_alternatives.save_first_months,
        recommendSavingFirst: data.safer_alternatives.recommend_saving_first,
      },
      disclaimer: data.disclaimer,
    };
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
      remainingAmount: g.remaining_amount ?? Math.max(0, g.target_amount - g.current_amount),
      progressPercentage: g.progress_percentage ?? Math.min(100, Math.round((g.current_amount / g.target_amount) * 100)),
      targetDate: g.target_date,
      status: g.status,
      suggestedDailySaving: g.suggested_daily_saving,
      contributions: (g.contributions || []).map((c: any) => ({
        id: c.id,
        goalId: c.goal_id,
        amount: c.amount,
        contributionDate: c.contribution_date,
        note: c.note,
        createdAt: c.created_at,
      })),
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
      remainingAmount: data.remaining_amount ?? Math.max(0, data.target_amount - data.current_amount),
      progressPercentage: data.progress_percentage ?? Math.min(100, Math.round((data.current_amount / data.target_amount) * 100)),
      targetDate: data.target_date,
      status: data.status,
      suggestedDailySaving: data.suggested_daily_saving,
      contributions: (data.contributions || []).map((c: any) => ({
        id: c.id,
        goalId: c.goal_id,
        amount: c.amount,
        contributionDate: c.contribution_date,
        note: c.note,
        createdAt: c.created_at,
      })),
    };
  },

  addSavingsContribution: async (goalId: string, contribution: {
    amount: number;
    contributionDate?: string;
    note?: string;
  }): Promise<SavingsGoal> => {
    const data = await request<any>(`/savings-goals/${goalId}/contributions`, {
      method: 'POST',
      body: JSON.stringify({
        amount: contribution.amount,
        contribution_date: contribution.contributionDate,
        note: contribution.note,
      }),
    });

    return {
      id: data.id,
      name: data.goal_name,
      targetAmount: data.target_amount,
      currentAmount: data.current_amount,
      remainingAmount: data.remaining_amount ?? Math.max(0, data.target_amount - data.current_amount),
      progressPercentage: data.progress_percentage ?? Math.min(100, Math.round((data.current_amount / data.target_amount) * 100)),
      targetDate: data.target_date,
      status: data.status,
      suggestedDailySaving: data.suggested_daily_saving,
      contributions: (data.contributions || []).map((c: any) => ({
        id: c.id,
        goalId: c.goal_id,
        amount: c.amount,
        contributionDate: c.contribution_date,
        note: c.note,
        createdAt: c.created_at,
      })),
    };
  },

  getGoalContributions: async (goalId: string): Promise<SavingsContribution[]> => {
    const data = await request<any[]>(`/savings-goals/${goalId}/contributions`);
    return data.map((c: any) => ({
      id: c.id,
      goalId: c.goal_id,
      amount: c.amount,
      contributionDate: c.contribution_date,
      note: c.note,
      createdAt: c.created_at,
    }));
  },

  // -------------------------------------------------------------
  // Repayments & Bills
  // -------------------------------------------------------------
  getRepayments: async (facilityType?: string): Promise<RepaymentSchedule[]> => {
    const params = new URLSearchParams();
    if (facilityType && facilityType !== 'ALL') params.append('facility_type', facilityType);
    const query = params.toString() ? `?${params.toString()}` : '';

    const data = await request<any[]>(`/repayments${query}`);
    return data.map((r: any) => ({
      id: r.id,
      facilityType: r.facility_type || 'LOAN',
      loanName: r.loan_name,
      provider: r.provider,
      installmentAmount: r.installment_amount,
      dueDate: r.due_date,
      status: r.status,
      principalRemaining: r.principal_remaining,
      totalPrincipal: r.total_principal,
      isRecurring: Boolean(r.is_recurring),
      frequency: r.frequency || 'MONTHLY',
      notes: r.notes,
      urgency: r.urgency || 'UPCOMING',
      payments: (r.payments || []).map((p: any) => ({
        id: p.id,
        repaymentId: p.repayment_id,
        amountPaid: p.amount_paid,
        paymentDate: p.payment_date,
        paymentMethod: p.payment_method,
        notes: p.notes,
        createdAt: p.created_at,
      })),
    }));
  },

  createRepayment: async (item: {
    facilityType: 'LOAN' | 'BILL';
    name: string;
    provider: string;
    amount: number;
    totalPrincipal?: number;
    dueDate: string;
    isRecurring?: boolean;
    frequency?: string;
    notes?: string;
  }): Promise<RepaymentSchedule> => {
    const data = await request<any>('/repayments', {
      method: 'POST',
      body: JSON.stringify({
        facility_type: item.facilityType,
        name: item.name,
        provider: item.provider,
        amount: item.amount,
        total_principal: item.totalPrincipal,
        due_date: item.dueDate,
        is_recurring: item.isRecurring || false,
        frequency: item.frequency || 'MONTHLY',
        notes: item.notes,
      }),
    });

    return {
      id: data.id,
      facilityType: data.facility_type,
      loanName: data.loan_name,
      provider: data.provider,
      installmentAmount: data.installment_amount,
      dueDate: data.due_date,
      status: data.status,
      principalRemaining: data.principal_remaining,
      totalPrincipal: data.total_principal,
      isRecurring: Boolean(data.is_recurring),
      frequency: data.frequency,
      notes: data.notes,
      urgency: data.urgency,
      payments: (data.payments || []).map((p: any) => ({
        id: p.id,
        repaymentId: p.repayment_id,
        amountPaid: p.amount_paid,
        paymentDate: p.payment_date,
        paymentMethod: p.payment_method,
        notes: p.notes,
        createdAt: p.created_at,
      })),
    };
  },

  updateRepayment: async (id: string, updates: {
    facilityType?: 'LOAN' | 'BILL';
    name?: string;
    provider?: string;
    amount?: number;
    totalPrincipal?: number;
    principalRemaining?: number;
    dueDate?: string;
    isRecurring?: boolean;
    frequency?: string;
    status?: string;
    notes?: string;
  }): Promise<RepaymentSchedule> => {
    const data = await request<any>(`/repayments/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        facility_type: updates.facilityType,
        name: updates.name,
        provider: updates.provider,
        amount: updates.amount,
        total_principal: updates.totalPrincipal,
        principal_remaining: updates.principalRemaining,
        due_date: updates.dueDate,
        is_recurring: updates.isRecurring,
        frequency: updates.frequency,
        status: updates.status,
        notes: updates.notes,
      }),
    });

    return {
      id: data.id,
      facilityType: data.facility_type,
      loanName: data.loan_name,
      provider: data.provider,
      installmentAmount: data.installment_amount,
      dueDate: data.due_date,
      status: data.status,
      principalRemaining: data.principal_remaining,
      totalPrincipal: data.total_principal,
      isRecurring: Boolean(data.is_recurring),
      frequency: data.frequency,
      notes: data.notes,
      urgency: data.urgency,
      payments: (data.payments || []).map((p: any) => ({
        id: p.id,
        repaymentId: p.repayment_id,
        amountPaid: p.amount_paid,
        paymentDate: p.payment_date,
        paymentMethod: p.payment_method,
        notes: p.notes,
        createdAt: p.created_at,
      })),
    };
  },

  deleteRepayment: async (id: string): Promise<void> => {
    await request<any>(`/repayments/${id}`, {
      method: 'DELETE',
    });
  },

  recordPayment: async (id: string, payment: {
    amount: number;
    paymentDate?: string;
    paymentMethod?: string;
    notes?: string;
    advanceNextDueDate?: boolean;
    nextDueDate?: string;
  }): Promise<RepaymentSchedule> => {
    const data = await request<any>(`/repayments/${id}/payments`, {
      method: 'POST',
      body: JSON.stringify({
        amount: payment.amount,
        payment_date: payment.paymentDate,
        payment_method: payment.paymentMethod || 'UPI',
        notes: payment.notes,
        advance_next_due_date: payment.advanceNextDueDate ?? true,
        next_due_date: payment.nextDueDate,
      }),
    });

    return {
      id: data.id,
      facilityType: data.facility_type,
      loanName: data.loan_name,
      provider: data.provider,
      installmentAmount: data.installment_amount,
      dueDate: data.due_date,
      status: data.status,
      principalRemaining: data.principal_remaining,
      totalPrincipal: data.total_principal,
      isRecurring: Boolean(data.is_recurring),
      frequency: data.frequency,
      notes: data.notes,
      urgency: data.urgency,
      payments: (data.payments || []).map((p: any) => ({
        id: p.id,
        repaymentId: p.repayment_id,
        amountPaid: p.amount_paid,
        paymentDate: p.payment_date,
        paymentMethod: p.payment_method,
        notes: p.notes,
        createdAt: p.created_at,
      })),
    };
  },

  // -------------------------------------------------------------
  // AI Financial Coach & Spending Analyzer
  // -------------------------------------------------------------
  getSpendingAnalysis: async (): Promise<SpendingAnalysis> => {
    const data = await request<any>('/coach/spending-analysis');
    return {
      monthsAnalyzed: data.months_analyzed,
      isSufficient: data.is_sufficient,
      sufficiencyNote: data.sufficiency_note,
      averageMonthlyIncome: data.average_monthly_income,
      averageMonthlyExpenses: data.average_monthly_expenses,
      netMonthlySavings: data.net_monthly_savings,
      savingsRatePct: data.savings_rate_pct,
      categoryBreakdown: (data.category_breakdown || []).map((c: any) => ({
        category: c.category,
        categoryLabel: c.category_label,
        currentMonthlySpend: c.current_monthly_spend,
        percentageOfExpenses: c.percentage_of_expenses,
        percentageOfIncome: c.percentage_of_income,
        monthlyTrend: c.monthly_trend,
        isOpportunity: c.is_opportunity,
        suggestedMonthlyLimit: c.suggested_monthly_limit,
        potentialMonthlySavings: c.potential_monthly_savings,
        opportunityExplanation: c.opportunity_explanation,
        needsReview: c.needs_review || false,
      })),
      potentialTotalMonthlySavings: data.potential_total_monthly_savings,
      potentialTotalAnnualSavings: data.potential_total_annual_savings,
      reportingPeriodLabel: data.reporting_period_label,
    };
  },

  getBudgetRecommendations: async (): Promise<BudgetRecommendation[]> => {
    const data = await request<any[]>('/coach/recommendations');
    return data.map((r: any) => ({
      id: r.id,
      category: r.category,
      categoryLabel: r.category_label,
      currentMonthlySpend: r.current_monthly_spend,
      suggestedMonthlyLimit: r.suggested_monthly_limit,
      expectedMonthlySavings: r.expected_monthly_savings,
      expectedAnnualSavings: r.expected_annual_savings,
      reason: r.reason,
      status: r.status,
      linkedGoalId: r.linked_goal_id,
      linkedGoalName: r.linked_goal_name,
      actualCurrentSpend: r.actual_current_spend,
      isOverBudget: r.is_over_budget,
    }));
  },

  actOnRecommendation: async (
    recId: string, 
    action: 'ACCEPT' | 'DISMISS' | 'EDIT', 
    customLimit?: number, 
    linkGoalId?: string
  ): Promise<BudgetRecommendation> => {
    const data = await request<any>(`/coach/recommendations/${recId}/action`, {
      method: 'POST',
      body: JSON.stringify({
        action,
        custom_limit: customLimit,
        link_goal_id: linkGoalId || null,
      }),
    });
    return {
      id: data.id,
      category: data.category,
      categoryLabel: data.category_label,
      currentMonthlySpend: data.current_monthly_spend,
      suggestedMonthlyLimit: data.suggested_monthly_limit,
      expectedMonthlySavings: data.expected_monthly_savings,
      expectedAnnualSavings: data.expected_annual_savings,
      reason: data.reason,
      status: data.status,
      linkedGoalId: data.linked_goal_id,
      linkedGoalName: data.linked_goal_name,
      actualCurrentSpend: data.actual_current_spend,
      isOverBudget: data.is_over_budget,
    };
  },

  sendChatMessage: async (message: string, language: string = 'en'): Promise<{
    reply: string;
    language: string;
    isAiPowered: boolean;
    providerUsed: string;
    suggestedFollowups: string[];
    dataCitations?: any;
  }> => {
    const data = await request<any>('/coach/chat', {
      method: 'POST',
      body: JSON.stringify({ message, language }),
    });
    return {
      reply: data.reply,
      language: data.language,
      isAiPowered: data.is_ai_powered,
      providerUsed: data.provider_used,
      suggestedFollowups: data.suggested_followups || [],
      dataCitations: data.data_citations,
    };
  },

  getChatHistory: async (): Promise<ChatMessage[]> => {
    const data = await request<any[]>('/coach/chat/history');
    return data.map((m: any) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      language: m.language,
      createdAt: m.created_at,
    }));
  },

  clearChatHistory: async (): Promise<void> => {
    await request<any>('/coach/chat/history', { method: 'DELETE' });
  },
};
