from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import date, datetime
from decimal import Decimal

# Authentication schemas
class UserRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(..., min_length=7, max_length=20)
    worker_type: str = Field(default="DELIVERY_PARTNER")
    city: str = Field(default="Bengaluru")
    password: str = Field(..., min_length=6)

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict[str, Any]

class UserProfileResponse(BaseModel):
    id: str
    user_code: str
    email: str
    phone: Optional[str] = None
    full_name: str
    worker_type: str
    city: str
    preferred_language: str
    is_demo: bool
    has_consented: bool
    registration_date: str

# Consent schemas
class ConsentRequest(BaseModel):
    has_consented: bool
    purpose: str = "FINANCIAL_ASSESSMENT_AND_SCORING"

class ConsentResponse(BaseModel):
    is_active: bool
    granted_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None

# Transaction schemas
class TransactionResponse(BaseModel):
    id: str
    transaction_date: str
    description: str
    amount: float
    transaction_type: str
    category: str
    payment_method: str
    counterparty: str
    status: str
    balance: Optional[float] = None
    is_refund: bool
    is_duplicate_test: bool

class TransactionCategoryUpdate(BaseModel):
    category: str

# Statement Import schemas
class StatementPreviewResponse(BaseModel):
    filename: str
    total_rows: int
    detected_columns: list[str]
    valid_rows: int
    warning_count: int
    sample_rows: list[dict[str, Any]]

class StatementImportResponse(BaseModel):
    import_id: str
    filename: str
    total_rows: int
    imported_rows: int
    duplicate_rows: int
    status: str
    message: str

# Score & Dashboard schemas
class ScoreBreakdownResponse(BaseModel):
    score: Optional[float]
    status: str
    version: str
    months_of_data: int
    average_monthly_income: float
    components: dict[str, Any]
    explanation: str

class MonthlySummaryItem(BaseModel):
    month: str
    income: float
    expenses: float
    essential_expenses: float
    business_expenses: float
    other_expenses: float
    savings_contributions: float
    net_cash_flow: float
    closing_balance: float
    successful_transactions: int

class DashboardSummaryResponse(BaseModel):
    user: UserProfileResponse
    trust_score: Optional[ScoreBreakdownResponse]
    monthly_summaries: list[MonthlySummaryItem]
    recent_transactions: list[TransactionResponse]
    metrics: dict[str, Any]

# Savings Goal schemas
class SavingsContributionCreate(BaseModel):
    amount: Decimal = Field(..., gt=0)
    contribution_date: Optional[date] = None
    note: Optional[str] = None

class SavingsContributionResponse(BaseModel):
    id: str
    goal_id: str
    amount: float
    contribution_date: str
    note: Optional[str] = None
    created_at: str

class SavingsGoalCreate(BaseModel):
    goal_name: str = Field(..., min_length=2, max_length=120)
    target_amount: Decimal = Field(..., gt=0)
    current_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    target_date: date

class SavingsGoalResponse(BaseModel):
    id: str
    goal_name: str
    target_amount: float
    current_amount: float
    remaining_amount: float
    progress_percentage: float
    target_date: str
    status: str
    suggested_daily_saving: float
    contributions: Optional[list[SavingsContributionResponse]] = []

# Loan Offer schemas
class LoanOfferResponse(BaseModel):
    id: str
    name: str
    provider: str
    min_amount: float
    max_amount: float
    interest_rate: float
    tenure_months: int
    repayment_method: str
    eligibility_rule: str
    is_eligible: bool
    simulated: bool
    disclaimer: str

class LoanApplicationRequest(BaseModel):
    offer_id: str
    requested_amount: Decimal

# Repayment & Bill schemas
class PaymentRecordCreate(BaseModel):
    amount: Decimal = Field(..., gt=0)
    payment_date: Optional[date] = None
    payment_method: Optional[str] = "UPI"
    notes: Optional[str] = None
    advance_next_due_date: Optional[bool] = True
    next_due_date: Optional[date] = None

class PaymentRecordResponse(BaseModel):
    id: str
    repayment_id: str
    amount_paid: float
    payment_date: str
    payment_method: str
    notes: Optional[str] = None
    created_at: str

class RepaymentCreate(BaseModel):
    facility_type: str = Field(default="LOAN") # LOAN, BILL
    name: str = Field(..., min_length=2, max_length=120)
    provider: str = Field(..., min_length=2, max_length=120)
    amount: Decimal = Field(..., gt=0) # installment or bill amount
    total_principal: Optional[Decimal] = None # For loans
    due_date: date
    is_recurring: bool = False
    frequency: Optional[str] = "MONTHLY"
    notes: Optional[str] = None

class RepaymentUpdate(BaseModel):
    facility_type: Optional[str] = None
    name: Optional[str] = None
    provider: Optional[str] = None
    amount: Optional[Decimal] = None
    total_principal: Optional[Decimal] = None
    principal_remaining: Optional[Decimal] = None
    due_date: Optional[date] = None
    is_recurring: Optional[bool] = None
    frequency: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class RepaymentResponse(BaseModel):
    id: str
    facility_type: str = "LOAN"
    loan_name: str
    provider: str
    installment_amount: float
    due_date: str
    status: str
    principal_remaining: float
    total_principal: Optional[float] = None
    is_recurring: bool = False
    frequency: str = "MONTHLY"
    notes: Optional[str] = None
    urgency: str = "UPCOMING" # OVERDUE, DUE_SOON, UPCOMING, SETTLED
    payments: Optional[list[PaymentRecordResponse]] = []

# AI Financial Coach & Spending Analyzer schemas
class CategorySpendingItem(BaseModel):
    category: str
    category_label: str
    current_monthly_spend: float
    percentage_of_expenses: float
    percentage_of_income: float
    monthly_trend: str # INCREASING, STABLE, DECREASING
    is_opportunity: bool
    suggested_monthly_limit: Optional[float] = None
    potential_monthly_savings: Optional[float] = None
    opportunity_explanation: Optional[str] = None
    needs_review: Optional[bool] = False

class SpendingAnalysisResponse(BaseModel):
    months_analyzed: int
    is_sufficient: bool
    sufficiency_note: str
    average_monthly_income: float
    average_monthly_expenses: float
    net_monthly_savings: float
    savings_rate_pct: float
    category_breakdown: list[CategorySpendingItem]
    potential_total_monthly_savings: float
    potential_total_annual_savings: float
    reporting_period_label: Optional[str] = None

class BudgetRecommendationResponse(BaseModel):
    id: str
    category: str
    category_label: str
    current_monthly_spend: float
    suggested_monthly_limit: float
    expected_monthly_savings: float
    expected_annual_savings: float
    reason: str
    status: str # PENDING, ACCEPTED, DISMISSED
    linked_goal_id: Optional[str] = None
    linked_goal_name: Optional[str] = None
    actual_current_spend: float
    is_over_budget: bool

class RecommendationActionRequest(BaseModel):
    action: str = Field(..., pattern="^(ACCEPT|DISMISS|EDIT)$")
    custom_limit: Optional[Decimal] = None
    link_goal_id: Optional[str] = None

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    language: Optional[str] = "en" # en, hi, mr

class ChatMessageResponse(BaseModel):
    id: str
    role: str
    content: str
    language: str
    created_at: str

class ChatResponse(BaseModel):
    reply: str
    language: str
    is_ai_powered: bool
    provider_used: str
    suggested_followups: list[str] = []
    data_citations: Optional[dict[str, Any]] = None

# Debt-Trap Prevention & Loan Affordability schemas
class LoanAffordabilityRequest(BaseModel):
    loan_amount: float = Field(..., gt=0, description="Proposed loan principal in INR")
    annual_interest_rate: float = Field(..., ge=0, description="Annual interest rate percentage (APR)")
    tenure_months: int = Field(..., gt=0, le=360, description="Repayment duration in months")
    processing_fee: Optional[float] = Field(0.0, ge=0, description="Known upfront processing fee")

class AffordabilityBaselineResponse(BaseModel):
    user_id: str
    is_sufficient: bool
    months_analyzed: int
    transactions_analyzed: int
    average_monthly_income: float
    conservative_monthly_income: float
    income_variability_cv: float
    essential_living_expenses: float
    necessary_business_expenses: float
    existing_loan_commitments: float
    upcoming_bills: float
    current_savings_buffer: float
    total_monthly_outflows: float
    disposable_income_before_loan: float
    conservative_disposable_before_loan: float

class LoanAffordabilityResponse(BaseModel):
    verdict: str # LIKELY_AFFORDABLE, PROCEED_WITH_CAUTION, NOT_AFFORDABLE, INSUFFICIENT_DATA
    reasons: list[str]
    loan_parameters: dict[str, Any]
    repayment_metrics: dict[str, Any]
    stress_test: dict[str, Any]
    user_financial_profile: AffordabilityBaselineResponse
    safer_alternatives: dict[str, Any]
    disclaimer: str
