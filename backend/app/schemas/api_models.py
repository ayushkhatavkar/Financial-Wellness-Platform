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
    target_date: str
    status: str
    suggested_daily_saving: float

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

# Repayment schemas
class RepaymentResponse(BaseModel):
    id: str
    loan_name: str
    provider: str
    installment_amount: float
    due_date: str
    status: str
    principal_remaining: float
