import uuid
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.session import get_db
from app.api.deps import get_current_user
from app.core.security import hash_password, verify_password, create_access_token
from app.models.entities import (
    User,
    ConsentRecord,
    Transaction,
    FinancialScore,
    LoanOffer,
    LoanApplication,
    SavingsGoal,
    Repayment,
    StatementImport
)
from app.schemas.api_models import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    UserProfileResponse,
    ConsentRequest,
    ConsentResponse,
    TransactionResponse,
    TransactionCategoryUpdate,
    StatementPreviewResponse,
    StatementImportResponse,
    ScoreBreakdownResponse,
    DashboardSummaryResponse,
    MonthlySummaryItem,
    SavingsGoalCreate,
    SavingsGoalResponse,
    LoanOfferResponse,
    LoanApplicationRequest,
    RepaymentResponse
)
from app.scoring.engine import calculate_financial_trust_score
from app.imports.statement_parser import parse_csv_statement

router = APIRouter()

# -------------------------------------------------------------
# 1. Health Endpoint
# -------------------------------------------------------------
@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "SahayakFin API",
        "database": "connected",
        "timestamp": datetime.utcnow().isoformat()
    }

# -------------------------------------------------------------
# 2. Registration & Authentication
# -------------------------------------------------------------
@router.post("/auth/register", response_model=TokenResponse)
def register_user(payload: UserRegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    user_code = f"USR-{uuid.uuid4().hex[:6].upper()}"
    new_user = User(
        user_code=user_code,
        email=payload.email.lower(),
        phone=payload.phone,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        worker_type=payload.worker_type,
        city=payload.city,
        is_demo=False
    )
    db.add(new_user)
    db.flush()

    # Initial default consent entry (pending explicit opt-in confirmation)
    consent = ConsentRecord(
        user_id=new_user.id,
        is_active=True,
        purpose="FINANCIAL_ASSESSMENT_AND_SCORING"
    )
    db.add(consent)
    db.commit()
    db.refresh(new_user)

    token = create_access_token({"sub": new_user.id, "email": new_user.email})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "user_code": new_user.user_code,
            "email": new_user.email,
            "full_name": new_user.full_name,
            "worker_type": new_user.worker_type,
            "city": new_user.city,
            "is_demo": new_user.is_demo
        }
    }

@router.post("/auth/login", response_model=TokenResponse)
def login_user(payload: UserLoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email address or password."
        )

    token = create_access_token({"sub": user.id, "email": user.email})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "user_code": user.user_code,
            "email": user.email,
            "full_name": user.full_name,
            "worker_type": user.worker_type,
            "city": user.city,
            "is_demo": user.is_demo
        }
    }

@router.get("/auth/demo-users")
def list_demo_showcase_users(db: Session = Depends(get_db)):
    """Return top 3 verified demonstration personas from PostgreSQL for 1-click evaluation."""
    codes = ["USER0001", "USER0002", "USER0003"]
    users = db.query(User).filter(User.user_code.in_(codes), User.is_demo == True).all()
    return [
        {
            "id": u.id,
            "user_code": u.user_code,
            "full_name": u.full_name,
            "worker_type": u.worker_type,
            "city": u.city,
            "email": u.email
        }
        for u in users
    ]

@router.post("/auth/demo-login/{user_code}", response_model=TokenResponse)
def demo_showcase_login(user_code: str, db: Session = Depends(get_db)):
    """Safely generate a verified JWT for verified demo accounts (is_demo == True only)."""
    user = db.query(User).filter(User.user_code == user_code.upper(), User.is_demo == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Designated demonstration account not found."
        )

    token = create_access_token({"sub": user.id, "email": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "user_code": user.user_code,
            "email": user.email,
            "full_name": user.full_name,
            "worker_type": user.worker_type,
            "city": user.city,
            "is_demo": user.is_demo
        }
    }

@router.get("/users/me", response_model=UserProfileResponse)
def get_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    active_consent = db.query(ConsentRecord).filter(
        ConsentRecord.user_id == current_user.id,
        ConsentRecord.is_active == True
    ).first()

    return {
        "id": current_user.id,
        "user_code": current_user.user_code,
        "email": current_user.email,
        "phone": current_user.phone,
        "full_name": current_user.full_name,
        "worker_type": current_user.worker_type,
        "city": current_user.city,
        "preferred_language": current_user.preferred_language,
        "is_demo": current_user.is_demo,
        "has_consented": bool(active_consent),
        "registration_date": current_user.created_at.strftime("%Y-%m-%d")
    }

# -------------------------------------------------------------
# 3. Consent Management
# -------------------------------------------------------------
@router.post("/consent", response_model=ConsentResponse)
def update_consent(
    payload: ConsentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    consent = db.query(ConsentRecord).filter(ConsentRecord.user_id == current_user.id).first()
    if not consent:
        consent = ConsentRecord(user_id=current_user.id)
        db.add(consent)

    consent.is_active = payload.has_consented
    if payload.has_consented:
        consent.granted_at = datetime.utcnow()
        consent.revoked_at = None
    else:
        consent.revoked_at = datetime.utcnow()

    db.commit()
    db.refresh(consent)

    return {
        "is_active": consent.is_active,
        "granted_at": consent.granted_at,
        "revoked_at": consent.revoked_at
    }

# -------------------------------------------------------------
# 4. Transactions Ledger
# -------------------------------------------------------------
@router.get("/transactions", response_model=list[TransactionResponse])
def get_transactions(
    category: Optional[str] = None,
    transaction_type: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    if category and category != "ALL":
        query = query.filter(Transaction.category == category)
    if transaction_type and transaction_type != "ALL":
        query = query.filter(Transaction.transaction_type == transaction_type.upper())

    results = query.order_by(desc(Transaction.transaction_date)).limit(limit).all()

    return [
        {
            "id": t.id,
            "transaction_date": t.transaction_date.strftime("%Y-%m-%d"),
            "description": t.description,
            "amount": float(t.amount),
            "transaction_type": t.transaction_type,
            "category": t.category,
            "payment_method": t.payment_method,
            "counterparty": t.counterparty,
            "status": t.status,
            "balance": float(t.balance) if t.balance else None,
            "is_refund": t.is_refund,
            "is_duplicate_test": t.is_duplicate_test
        }
        for t in results
    ]

@router.patch("/transactions/{transaction_id}/category")
def update_transaction_category(
    transaction_id: str,
    payload: TransactionCategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tx = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id
    ).first()

    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found.")

    tx.category = payload.category
    tx.user_corrected_category = payload.category
    db.commit()
    return {"message": "Transaction category updated.", "id": tx.id, "new_category": tx.category}

# -------------------------------------------------------------
# 5. Statement Upload & Import Pipeline
# -------------------------------------------------------------
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB limit

@router.post("/statements/preview", response_model=StatementPreviewResponse)
async def preview_statement(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only standard .csv files are supported.")

    # Check active user consent
    consent = db.query(ConsentRecord).filter(
        ConsentRecord.user_id == current_user.id,
        ConsentRecord.is_active == True
    ).first()
    if not consent:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Statement parsing requires active user consent. Please enable consent in Profile & Privacy settings."
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds maximum allowed size limit of 10MB.")

    try:
        preview, _ = parse_csv_statement(content, file.filename)
        return preview
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/statements/import", response_model=StatementImportResponse)
async def commit_statement_import(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only standard .csv files are supported.")

    # Check active user consent
    consent = db.query(ConsentRecord).filter(
        ConsentRecord.user_id == current_user.id,
        ConsentRecord.is_active == True
    ).first()
    if not consent:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Statement ingestion requires active user consent. Please enable consent in Profile & Privacy settings."
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds maximum allowed size limit of 10MB.")

    try:
        preview, records = parse_csv_statement(content, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Log statement import metadata
    stmt_import = StatementImport(
        user_id=current_user.id,
        filename=file.filename,
        total_rows=preview["total_rows"],
        imported_rows=0,
        duplicate_rows=0,
        status="SUCCESS"
    )
    db.add(stmt_import)
    db.flush()

    inserted = 0
    duplicates = 0

    for rec in records:
        external_id = rec.get("ref_id", "")
        has_real_ref = bool(external_id and not str(external_id).startswith("CSV-"))

        # Deduplication check scoped to current user:
        existing = None
        if has_real_ref:
            existing = db.query(Transaction).filter(
                Transaction.user_id == current_user.id,
                Transaction.duplicate_of_transaction_id == str(external_id)
            ).first()

        if not existing:
            existing = db.query(Transaction).filter(
                Transaction.user_id == current_user.id,
                Transaction.transaction_date == rec["transaction_date"],
                Transaction.amount == rec["amount"],
                Transaction.description == rec["description"]
            ).first()

        if existing:
            duplicates += 1
            continue

        new_tx = Transaction(
            id=f"TXN-{uuid.uuid4().hex[:10].upper()}",
            user_id=current_user.id,
            import_id=stmt_import.id,
            transaction_date=rec["transaction_date"],
            description=rec["description"],
            amount=rec["amount"],
            transaction_type=rec["transaction_type"],
            category=rec["category"],
            payment_method=rec.get("payment_method", "UPI"),
            counterparty=rec.get("counterparty", "Self/Vendor"),
            status=rec.get("status", "SUCCESS"),
            is_refund=rec.get("is_refund", False),
            is_excluded_from_scoring=rec.get("is_excluded_from_scoring", False),
            duplicate_of_transaction_id=str(external_id) if has_real_ref else None,
            created_at=datetime.utcnow()
        )
        db.add(new_tx)
        inserted += 1

    stmt_import.imported_rows = inserted
    stmt_import.duplicate_rows = duplicates
    db.commit()

    return {
        "import_id": stmt_import.id,
        "filename": stmt_import.filename,
        "total_rows": stmt_import.total_rows,
        "imported_rows": inserted,
        "duplicate_rows": duplicates,
        "status": "SUCCESS",
        "message": f"Successfully ingested {inserted} records. {duplicates} duplicates safely bypassed."
    }

# -------------------------------------------------------------
# 6. Trust Score Engine
# -------------------------------------------------------------
@router.get("/score/latest", response_model=ScoreBreakdownResponse)
def get_latest_trust_score(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Fetch user transactions and calculate fresh deterministic score
    txns = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    calculated = calculate_financial_trust_score(txns)

    return {
        "score": calculated["score"],
        "status": calculated["status"],
        "version": "v1.0-hackathon",
        "months_of_data": calculated["months_of_data"],
        "average_monthly_income": calculated["average_monthly_income"],
        "components": calculated["components"],
        "explanation": calculated["explanation"]
    }

# -------------------------------------------------------------
# 7. Dashboard Aggregation
# -------------------------------------------------------------
@router.get("/dashboard/summary")
def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    txns = db.query(Transaction).filter(
        Transaction.user_id == current_user.id
    ).order_by(desc(Transaction.transaction_date)).all()

    score_result = calculate_financial_trust_score(txns)

    # Compute monthly summaries
    from collections import defaultdict
    monthly = defaultdict(lambda: {
        "income": 0.0,
        "expense": 0.0,
        "essential": 0.0,
        "business": 0.0,
        "other": 0.0,
        "savings": 0.0,
        "count": 0,
        "latest_balance": None
    })

    for t in txns:
        if t.status == "SUCCESS" and not t.is_duplicate_test and not t.is_excluded_from_scoring:
            m_sort_key = t.transaction_date.strftime("%Y-%m")
            m_label = t.transaction_date.strftime("%b %Y")
            amt = float(t.amount)

            if t.transaction_type == "CREDIT" and not t.is_refund:
                monthly[m_sort_key]["income"] += amt
            elif t.transaction_type == "DEBIT":
                monthly[m_sort_key]["expense"] += amt
                if t.category in ["FOOD_GROCERIES", "HEALTHCARE", "UTILITIES"]:
                    monthly[m_sort_key]["essential"] += amt
                elif t.category in ["FUEL_TRANSPORT", "OPERATIONAL_EXPENSE"]:
                    monthly[m_sort_key]["business"] += amt
                elif t.category in ["SAVINGS_TRANSFER", "RD_DEPOSIT"]:
                    monthly[m_sort_key]["savings"] += amt
                else:
                    monthly[m_sort_key]["other"] += amt

            monthly[m_sort_key]["count"] += 1
            monthly[m_sort_key]["label"] = m_label
            if t.balance is not None and monthly[m_sort_key]["latest_balance"] is None:
                monthly[m_sort_key]["latest_balance"] = float(t.balance)

    # Sort months chronologically (earliest to latest for chart display)
    sorted_months = sorted(monthly.keys())
    running_cumulative_reserve = 0.0
    monthly_list = []

    for m_key in sorted_months:
        data = monthly[m_key]
        net = round(data["income"] - data["expense"], 2)
        running_cumulative_reserve += net
        closing_bal = data["latest_balance"] if data["latest_balance"] is not None else round(running_cumulative_reserve, 2)

        monthly_list.append({
            "month": data.get("label", m_key),
            "monthKey": m_key,
            "income": round(data["income"], 2),
            "expenses": round(data["expense"], 2),
            "essentialExpenses": round(data["essential"], 2),
            "businessExpenses": round(data["business"], 2),
            "otherExpenses": round(data["other"], 2),
            "savingsContributions": round(data["savings"], 2),
            "net_cash_flow": net,
            "netCashFlow": net,
            "closing_balance": closing_bal,
            "closingBalance": closing_bal,
            "successful_transactions": data["count"]
        })

    # Compute overall metrics
    months_count = len(sorted_months)
    total_income = sum(m["income"] for m in monthly_list)
    total_expenses = sum(m["expenses"] for m in monthly_list)
    avg_income = round(total_income / months_count, 2) if months_count > 0 else 0.0
    avg_expenses = round(total_expenses / months_count, 2) if months_count > 0 else 0.0
    latest_income = monthly_list[-1]["income"] if monthly_list else 0.0
    latest_expenses = monthly_list[-1]["expenses"] if monthly_list else 0.0
    latest_month_label = monthly_list[-1]["month"] if monthly_list else ""
    has_verified_balance = any(t.balance is not None for t in txns)
    final_reserve = monthly_list[-1]["closingBalance"] if monthly_list else 0.0

    # Expense categorization from user's actual debits
    cat_totals = defaultdict(float)
    category_labels = {
        "Fuel Transport": "Fuel & Transport",
        "Food Groceries": "Food & Dining",
        "Food": "Food & Dining",
        "Savings Transfer": "Savings Transfers",
        "Utilities": "Utilities & Recharges",
        "Healthcare": "Healthcare",
        "Business Expense": "Business Operations",
        "Operational Expense": "Business Operations",
        "Other Expense": "Personal & Peer Transfers",
        "Other": "Other Outflows"
    }

    color_palette = {
        "Fuel & Transport": "#0f766e",
        "Food & Dining": "#14b8a6",
        "Savings Transfers": "#10b981",
        "Utilities & Recharges": "#6366f1",
        "Healthcare": "#ec4899",
        "Business Operations": "#f59e0b",
        "Personal & Peer Transfers": "#94a3b8",
        "Other Outflows": "#cbd5e1"
    }

    for t in txns:
        if t.status == "SUCCESS" and not t.is_duplicate_test and not t.is_excluded_from_scoring and t.transaction_type == "DEBIT":
            raw_cat = t.category.replace("_", " ").title()
            pretty_label = category_labels.get(raw_cat, raw_cat)
            cat_totals[pretty_label] += float(t.amount)

    category_breakdown = [
        {
            "name": cat,
            "value": round(amt, 2),
            "percentage": round((amt / total_expenses) * 100, 1) if total_expenses > 0 else 0.0,
            "color": color_palette.get(cat, "#0f766e")
        }
        for cat, amt in sorted(cat_totals.items(), key=lambda x: x[1], reverse=True)
    ]

    recent = [
        {
            "id": t.id,
            "date": t.transaction_date.strftime("%Y-%m-%d"),
            "description": t.description,
            "amount": float(t.amount),
            "type": t.transaction_type,
            "category": t.category,
            "paymentMethod": t.payment_method,
            "counterparty": t.counterparty,
            "status": t.status,
            "isRefund": t.is_refund
        }
        for t in txns[:5]
    ]

    metrics = {
        "averageMonthlyInflow": avg_income,
        "averageMonthlyExpenses": avg_expenses,
        "monthlyExpenses": avg_expenses,
        "latestMonthlyInflow": latest_income,
        "latestMonthlyExpenses": latest_expenses,
        "latestMonthLabel": latest_month_label,
        "closingReserve": final_reserve,
        "hasVerifiedReserve": has_verified_balance,
        "reserveStatus": "VERIFIED_BALANCE" if has_verified_balance else ("CUMULATIVE_CASH_FLOW" if months_count > 0 else "UNAVAILABLE"),
        "totalIncome": round(total_income, 2),
        "totalExpenses": round(total_expenses, 2),
        "total_income": round(total_income, 2),
        "total_expenses": round(total_expenses, 2),
        "score": score_result.get("score"),
        "monthsOfData": months_count,
        "expenseCategories": category_breakdown
    }

    return {
        "user": {
            "fullName": current_user.full_name,
            "userCode": current_user.user_code,
            "isDemo": current_user.is_demo,
            "workerType": current_user.worker_type,
            "city": current_user.city
        },
        "score": score_result,
        "monthlySummaries": monthly_list,
        "recentTransactions": recent,
        "metrics": metrics,
        "expenseCategories": category_breakdown
    }

# -------------------------------------------------------------
# 8. Loan Marketplace & Simulated Applications
# -------------------------------------------------------------
@router.get("/offers", response_model=list[LoanOfferResponse])
def get_loan_offers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    offers = db.query(LoanOffer).all()
    # Simple score-based eligibility check
    txns = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    score_res = calculate_financial_trust_score(txns)
    user_score = score_res["score"] or 0

    return [
        {
            "id": o.id,
            "name": o.offer_name,
            "provider": o.fictional_provider_name,
            "min_amount": float(o.minimum_amount),
            "max_amount": float(o.maximum_amount),
            "interest_rate": float(o.annual_interest_rate),
            "tenure_months": o.tenure_months,
            "repayment_method": o.repayment_method,
            "eligibility_rule": o.eligibility_rule,
            "is_eligible": (user_score >= 60 and o.id in ["LOAN-01", "LOAN-02"]) or (user_score >= 80),
            "simulated": True,
            "disclaimer": o.disclaimer
        }
        for o in offers
    ]

@router.post("/offers/apply")
def apply_simulated_loan(
    payload: LoanApplicationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    offer = db.query(LoanOffer).filter(LoanOffer.id == payload.offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found.")

    app = LoanApplication(
        user_id=current_user.id,
        offer_id=offer.id,
        requested_amount=payload.requested_amount,
        status="APPROVED_SIMULATED",
        simulation_notes="Instant simulated approval based on Financial Trust Score."
    )
    db.add(app)
    db.commit()

    return {
        "status": "APPROVED_SIMULATED",
        "offer_name": offer.offer_name,
        "sanction_amount": float(payload.requested_amount),
        "interest_rate": float(offer.annual_interest_rate),
        "message": "Simulated working capital application approved. Demonstration only."
    }

# -------------------------------------------------------------
# 9. Savings Goals & Repayments
# -------------------------------------------------------------
@router.get("/savings-goals", response_model=list[SavingsGoalResponse])
def get_savings_goals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    goals = db.query(SavingsGoal).filter(
        SavingsGoal.user_id == current_user.id
    ).order_by(desc(SavingsGoal.created_at)).all()

    return [
        {
            "id": g.id,
            "goal_name": g.goal_name,
            "target_amount": float(g.target_amount),
            "current_amount": float(g.current_amount),
            "target_date": g.target_date.strftime("%Y-%m-%d"),
            "status": g.status,
            "suggested_daily_saving": float(g.suggested_daily_saving)
        }
        for g in goals
    ]

@router.post("/savings-goals", response_model=SavingsGoalResponse)
def create_savings_goal(
    payload: SavingsGoalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    diff_days = max(1, (payload.target_date - date.today()).days)
    needed = max(Decimal("0.00"), payload.target_amount - payload.current_amount)
    suggested_daily = Decimal(str(round(float(needed) / diff_days, 2)))

    new_goal = SavingsGoal(
        user_id=current_user.id,
        goal_name=payload.goal_name,
        target_amount=payload.target_amount,
        current_amount=payload.current_amount,
        target_date=payload.target_date,
        status="COMPLETED" if payload.current_amount >= payload.target_amount else "IN_PROGRESS",
        suggested_daily_saving=suggested_daily
    )
    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)

    return {
        "id": new_goal.id,
        "goal_name": new_goal.goal_name,
        "target_amount": float(new_goal.target_amount),
        "current_amount": float(new_goal.current_amount),
        "target_date": new_goal.target_date.strftime("%Y-%m-%d"),
        "status": new_goal.status,
        "suggested_daily_saving": float(new_goal.suggested_daily_saving)
    }

@router.get("/repayments", response_model=list[RepaymentResponse])
def get_repayments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    reps = db.query(Repayment).filter(Repayment.user_id == current_user.id).all()
    # If user has no custom repayments, generate simulated demonstration schedules
    if not reps:
        return [
            {
                "id": "REP-101",
                "loan_name": "Kavach Fuel Micro-Line (Simulated)",
                "provider": "Fictional MicroFin Partner",
                "installment_amount": 1250.0,
                "due_date": "2026-11-05",
                "status": "UPCOMING",
                "principal_remaining": 3750.0
            },
            {
                "id": "REP-102",
                "loan_name": "Emergency Medical Line (Simulated)",
                "provider": "Fictional Care Assist Credit",
                "installment_amount": 850.0,
                "due_date": "2026-10-15",
                "status": "PAID",
                "principal_remaining": 0.0
            }
        ]

    return [
        {
            "id": r.id,
            "loan_name": r.loan_name,
            "provider": r.provider,
            "installment_amount": float(r.installment_amount),
            "due_date": r.due_date.strftime("%Y-%m-%d"),
            "status": r.status,
            "principal_remaining": float(r.principal_remaining)
        }
        for r in reps
    ]
