from datetime import datetime, date
import uuid
from typing import Optional, List
from sqlalchemy import (
    Column,
    String,
    Boolean,
    Integer,
    Numeric,
    Date,
    DateTime,
    ForeignKey,
    Text,
    Index
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.db.session import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_code = Column(String(30), unique=True, index=True, nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    phone = Column(String(30), nullable=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(120), nullable=False)
    worker_type = Column(String(50), nullable=False, default="DELIVERY_PARTNER")
    city = Column(String(60), nullable=False, default="Bengaluru")
    preferred_language = Column(String(30), nullable=False, default="English")
    account_status = Column(String(30), nullable=False, default="ACTIVE")
    is_demo = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    consents = relationship("ConsentRecord", back_populates="user", cascade="all, delete-orphan")
    statement_imports = relationship("StatementImport", back_populates="user", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    scores = relationship("FinancialScore", back_populates="user", cascade="all, delete-orphan")
    savings_goals = relationship("SavingsGoal", back_populates="user", cascade="all, delete-orphan")
    savings_contributions = relationship("SavingsGoalContribution", back_populates="user", cascade="all, delete-orphan")
    loan_applications = relationship("LoanApplication", back_populates="user", cascade="all, delete-orphan")
    repayments = relationship("Repayment", back_populates="user", cascade="all, delete-orphan")
    payment_records = relationship("PaymentRecord", back_populates="user", cascade="all, delete-orphan")
    budget_recommendations = relationship("BudgetRecommendation", back_populates="user", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessageRecord", back_populates="user", cascade="all, delete-orphan")

class ConsentRecord(Base):
    __tablename__ = "consent_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    purpose = Column(String(100), nullable=False, default="FINANCIAL_ASSESSMENT_AND_SCORING")
    data_scopes = Column(JSONB, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    granted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    revoked_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="consents")

class StatementImport(Base):
    __tablename__ = "statement_imports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    source_format = Column(String(50), nullable=False, default="CSV_STATEMENT")
    total_rows = Column(Integer, nullable=False, default=0)
    imported_rows = Column(Integer, nullable=False, default=0)
    duplicate_rows = Column(Integer, nullable=False, default=0)
    status = Column(String(30), nullable=False, default="SUCCESS")
    error_log = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="statement_imports")
    transactions = relationship("Transaction", back_populates="statement_import")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String(50), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    import_id = Column(String(36), ForeignKey("statement_imports.id", ondelete="SET NULL"), nullable=True)
    
    transaction_date = Column(Date, nullable=False, index=True)
    description = Column(Text, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    transaction_type = Column(String(10), nullable=False) # CREDIT, DEBIT
    balance = Column(Numeric(12, 2), nullable=True)
    category = Column(String(50), nullable=False, index=True)
    payment_method = Column(String(30), nullable=False, default="UPI")
    counterparty = Column(String(120), nullable=False, default="Unknown")
    status = Column(String(20), nullable=False, default="SUCCESS") # SUCCESS, PENDING, FAILED
    is_refund = Column(Boolean, nullable=False, default=False)
    is_duplicate_test = Column(Boolean, nullable=False, default=False)
    duplicate_of_transaction_id = Column(String(50), nullable=True)
    is_excluded_from_scoring = Column(Boolean, nullable=False, default=False)
    user_corrected_category = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="transactions")
    statement_import = relationship("StatementImport", back_populates="transactions")

    __table_args__ = (
        Index("idx_user_date", "user_id", "transaction_date"),
        Index("idx_user_cat", "user_id", "category"),
    )

class FinancialScore(Base):
    __tablename__ = "financial_scores"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    score_value = Column(Numeric(5, 2), nullable=True)
    income_stability_indicator = Column(Numeric(5, 2), nullable=True)
    savings_consistency_indicator = Column(Numeric(5, 2), nullable=True)
    expense_health_indicator = Column(Numeric(5, 2), nullable=True)
    bill_payment_consistency_indicator = Column(Numeric(5, 2), nullable=True)
    data_sufficiency_status = Column(String(40), nullable=False, default="SUFFICIENT")
    months_of_data = Column(Integer, nullable=False, default=0)
    average_monthly_income = Column(Numeric(12, 2), nullable=True)
    score_explanation = Column(Text, nullable=True)
    factor_breakdown = Column(JSONB, nullable=True)
    calculation_version = Column(String(30), nullable=False, default="v1.0-hackathon")
    calculated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="scores")

class LoanOffer(Base):
    __tablename__ = "loan_offers"

    id = Column(String(30), primary_key=True)
    offer_name = Column(String(120), nullable=False)
    fictional_provider_name = Column(String(120), nullable=False)
    minimum_amount = Column(Numeric(12, 2), nullable=False)
    maximum_amount = Column(Numeric(12, 2), nullable=False)
    annual_interest_rate = Column(Numeric(5, 2), nullable=False)
    tenure_months = Column(Integer, nullable=False)
    processing_fee = Column(Numeric(10, 2), nullable=False, default=0.00)
    processing_fee_type = Column(String(20), nullable=False, default="FLAT")
    repayment_method = Column(String(50), nullable=False)
    eligibility_rule = Column(Text, nullable=False)
    demo_offer = Column(Boolean, nullable=False, default=True)
    disclaimer = Column(Text, nullable=False)

    applications = relationship("LoanApplication", back_populates="offer")

class LoanApplication(Base):
    __tablename__ = "loan_applications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    offer_id = Column(String(30), ForeignKey("loan_offers.id"), nullable=False)
    requested_amount = Column(Numeric(12, 2), nullable=False)
    status = Column(String(30), nullable=False, default="APPROVED_SIMULATED")
    simulation_notes = Column(Text, nullable=True)
    applied_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="loan_applications")
    offer = relationship("LoanOffer", back_populates="applications")

class Repayment(Base):
    __tablename__ = "repayments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    facility_type = Column(String(20), nullable=False, default="LOAN") # LOAN, BILL
    loan_name = Column(String(120), nullable=False)
    provider = Column(String(120), nullable=False)
    installment_amount = Column(Numeric(12, 2), nullable=False)
    due_date = Column(Date, nullable=False)
    total_principal = Column(Numeric(12, 2), nullable=True)
    principal_remaining = Column(Numeric(12, 2), nullable=False, default=0.00)
    status = Column(String(20), nullable=False, default="UPCOMING") # PAID, UPCOMING, OVERDUE, DUE
    is_recurring = Column(Boolean, nullable=False, default=False)
    frequency = Column(String(20), nullable=False, default="MONTHLY") # MONTHLY, WEEKLY, ONE_TIME
    notes = Column(Text, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="repayments")
    payments = relationship("PaymentRecord", back_populates="repayment", cascade="all, delete-orphan", order_by="desc(PaymentRecord.payment_date)")

class PaymentRecord(Base):
    __tablename__ = "payment_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    repayment_id = Column(String(36), ForeignKey("repayments.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    amount_paid = Column(Numeric(12, 2), nullable=False)
    payment_date = Column(Date, nullable=False)
    payment_method = Column(String(30), nullable=False, default="UPI")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    repayment = relationship("Repayment", back_populates="payments")
    user = relationship("User", back_populates="payment_records")

class SavingsGoal(Base):
    __tablename__ = "savings_goals"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    goal_name = Column(String(120), nullable=False)
    target_amount = Column(Numeric(12, 2), nullable=False)
    current_amount = Column(Numeric(12, 2), nullable=False, default=0.00)
    target_date = Column(Date, nullable=False)
    status = Column(String(20), nullable=False, default="IN_PROGRESS") # IN_PROGRESS, COMPLETED, PAUSED
    suggested_daily_saving = Column(Numeric(10, 2), nullable=False, default=0.00)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="savings_goals")
    contributions = relationship("SavingsGoalContribution", back_populates="goal", cascade="all, delete-orphan", order_by="desc(SavingsGoalContribution.contribution_date)")

class SavingsGoalContribution(Base):
    __tablename__ = "savings_goal_contributions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    goal_id = Column(String(36), ForeignKey("savings_goals.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    contribution_date = Column(Date, nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    goal = relationship("SavingsGoal", back_populates="contributions")
    user = relationship("User", back_populates="savings_contributions")

class BudgetRecommendation(Base):
    __tablename__ = "budget_recommendations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category = Column(String(50), nullable=False)
    category_label = Column(String(100), nullable=False)
    current_monthly_spend = Column(Numeric(12, 2), nullable=False)
    suggested_monthly_limit = Column(Numeric(12, 2), nullable=False)
    expected_monthly_savings = Column(Numeric(12, 2), nullable=False)
    expected_annual_savings = Column(Numeric(12, 2), nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="PENDING") # PENDING, ACCEPTED, DISMISSED
    linked_goal_id = Column(String(36), ForeignKey("savings_goals.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="budget_recommendations")
    linked_goal = relationship("SavingsGoal")

class ChatMessageRecord(Base):
    __tablename__ = "chat_message_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False) # user, assistant
    content = Column(Text, nullable=False)
    language = Column(String(10), nullable=False, default="en")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="chat_messages")
