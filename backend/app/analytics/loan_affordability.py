"""
Debt-Trap Prevention Engine for SahayakFin.
Evaluates loan affordability for gig workers by combining real transaction cash flows,
essential living expenses, work-related operational costs, existing debt commitments,
and lower-income stress tests.
"""
from typing import Dict, Any, List, Optional
from datetime import date
import math
from collections import defaultdict
from sqlalchemy.orm import Session

from app.models.entities import Transaction, Repayment, SavingsGoal
from app.analytics.spending_analyzer import is_self_transfer_desc, is_loan_proceeds_desc

def calculate_reducing_balance_emi(
    principal: float, 
    annual_interest_rate: float, 
    tenure_months: int,
    processing_fee: float = 0.0
) -> Dict[str, float]:
    """
    Standard reducing balance EMI calculation.
    Handles zero-interest loans as an explicit case.
    """
    if principal <= 0 or tenure_months <= 0:
        raise ValueError("Loan principal and tenure months must be strictly positive.")
    if annual_interest_rate < 0 or processing_fee < 0:
        raise ValueError("Interest rate and processing fee must be non-negative.")

    if annual_interest_rate == 0.0:
        monthly_emi = round(principal / tenure_months, 2)
        total_interest = 0.0
        total_repayment = round(principal + processing_fee, 2)
    else:
        monthly_rate = (annual_interest_rate / 100.0) / 12.0
        numerator = monthly_rate * ((1.0 + monthly_rate) ** tenure_months)
        denominator = ((1.0 + monthly_rate) ** tenure_months) - 1.0
        monthly_emi = round(principal * (numerator / denominator), 2)
        total_interest = round((monthly_emi * tenure_months) - principal, 2)
        total_repayment = round((monthly_emi * tenure_months) + processing_fee, 2)

    return {
        "monthly_emi": monthly_emi,
        "total_interest": max(0.0, total_interest),
        "total_repayment": total_repayment,
        "processing_fee": round(processing_fee, 2)
    }

def get_user_affordability_baseline(db: Session, user_id: str) -> Dict[str, Any]:
    """
    Computes user's actual baseline financial metrics from verified PostgreSQL transactions
    and repayment commitments.
    """
    txns = db.query(Transaction).filter(
        Transaction.user_id == user_id,
        Transaction.status == "SUCCESS",
        Transaction.is_duplicate_test == False,
        Transaction.is_excluded_from_scoring == False
    ).order_by(Transaction.transaction_date.asc()).all()

    # Exclude loan proceeds, internal self-transfers, and refunds
    eligible_debits = [
        t for t in txns 
        if t.transaction_type == "DEBIT" 
        and not t.is_refund
        and t.category not in ["INTERNAL_TRANSFER", "LOAN_PROCEEDS", "SAVINGS_TRANSFER", "REFUND"]
        and not is_self_transfer_desc(t.description)
    ]
    
    eligible_credits = [
        t for t in txns
        if t.transaction_type == "CREDIT"
        and not t.is_refund
        and t.category not in ["INTERNAL_TRANSFER", "LOAN_PROCEEDS", "REFUND"]
        and not is_self_transfer_desc(t.description)
        and not is_loan_proceeds_desc(t.description)
    ]

    monthly_inflow = defaultdict(float)
    monthly_outflow = defaultdict(float)
    category_totals = defaultdict(float)
    all_months = set()

    for t in eligible_credits:
        m_key = t.transaction_date.strftime("%Y-%m")
        all_months.add(m_key)
        monthly_inflow[m_key] += float(t.amount)

    for t in eligible_debits:
        m_key = t.transaction_date.strftime("%Y-%m")
        all_months.add(m_key)
        monthly_outflow[m_key] += float(t.amount)
        cat = t.category.upper()
        category_totals[cat] += float(t.amount)

    sorted_months = sorted(list(all_months))
    months_count = len(sorted_months)
    is_sufficient = months_count >= 2 and len(eligible_debits) >= 4

    total_income = sum(monthly_inflow.values())
    avg_monthly_income = round(total_income / months_count, 2) if months_count > 0 else 0.0

    # Income variability & conservative income
    # Track calendar month spans to distinguish full months from partial boundary months (e.g. statement starting on 29th)
    month_dates = defaultdict(set)
    for t in eligible_credits + eligible_debits:
        m_key = t.transaction_date.strftime("%Y-%m")
        month_dates[m_key].add(t.transaction_date)

    full_month_inflows = []
    normalized_inflows = []
    for m_key in sorted_months:
        inflow = monthly_inflow.get(m_key, 0.0)
        dates = month_dates[m_key]
        if dates:
            day_span = (max(dates) - min(dates)).days + 1
            distinct_days = len(dates)
            # If a month has < 7 days span or < 3 distinct days, it is a partial edge month
            if day_span < 7 or distinct_days < 3:
                # Normalize partial month to 30-day equivalent run rate for comparison
                norm_inflow = round(inflow * (30.0 / max(1, day_span)), 2)
                normalized_inflows.append(norm_inflow)
            else:
                full_month_inflows.append(inflow)
                normalized_inflows.append(inflow)
        else:
            normalized_inflows.append(inflow)

    inflow_pool = full_month_inflows if full_month_inflows else normalized_inflows
    if not inflow_pool:
        inflow_pool = list(monthly_inflow.values()) if monthly_inflow else [0.0]

    if len(inflow_pool) >= 2 and avg_monthly_income > 0:
        variance = sum((x - avg_monthly_income) ** 2 for x in inflow_pool) / len(inflow_pool)
        std_dev = math.sqrt(variance)
        cv = round(std_dev / avg_monthly_income, 3)
        # Conservative income: min among verified multi-month cycles, with a realistic volatility floor
        min_inflow = min(inflow_pool)
        conservative_monthly_income = round(max(avg_monthly_income * 0.70, min(min_inflow, avg_monthly_income * 0.85)), 2)
    elif len(inflow_pool) == 1 and avg_monthly_income > 0:
        cv = 0.0
        conservative_monthly_income = round(min(avg_monthly_income * 0.85, inflow_pool[0]), 2)
    else:
        cv = 0.0
        conservative_monthly_income = round(avg_monthly_income * 0.85, 2)

    # Categorize outflows into essential living vs necessary business
    # Essential living: Food, utilities, healthcare, general living
    # Necessary business: Fuel, vehicle repairs & spares, tools
    total_debits_amt = sum(monthly_outflow.values())
    avg_total_expenses = round(total_debits_amt / months_count, 2) if months_count > 0 else 0.0

    essential_living_cats = ["FOOD_GROCERIES", "UTILITIES", "HEALTHCARE", "OTHER_EXPENSE"]
    business_cats = ["FUEL_TRANSPORT", "BUSINESS_EXPENSE"]

    essential_living_total = sum(category_totals.get(c, 0.0) for c in essential_living_cats)
    business_total = sum(category_totals.get(c, 0.0) for c in business_cats)

    essential_living_monthly = round(essential_living_total / months_count, 2) if months_count > 0 else 0.0
    business_monthly = round(business_total / months_count, 2) if months_count > 0 else 0.0

    # Existing debt commitments & upcoming bills from Repayments table
    active_repayments = db.query(Repayment).filter(
        Repayment.user_id == user_id,
        Repayment.status != "PAID"
    ).all()

    existing_loan_commitments = round(sum(
        float(r.installment_amount) for r in active_repayments 
        if r.facility_type == "LOAN" and float(r.principal_remaining) > 0
    ), 2)

    upcoming_bills = round(sum(
        float(r.installment_amount) for r in active_repayments 
        if r.facility_type == "BILL"
    ), 2)

    # Current savings from Savings Goals
    savings_goals = db.query(SavingsGoal).filter(SavingsGoal.user_id == user_id).all()
    current_savings_buffer = round(sum(float(g.current_amount) for g in savings_goals), 2)

    # Monthly disposable income before any new loan
    total_monthly_outflows = round(
        essential_living_monthly + business_monthly + existing_loan_commitments + upcoming_bills, 2
    )
    disposable_income_before_loan = round(avg_monthly_income - total_monthly_outflows, 2)
    conservative_disposable_before_loan = round(conservative_monthly_income - total_monthly_outflows, 2)

    return {
        "user_id": user_id,
        "is_sufficient": is_sufficient,
        "months_analyzed": months_count,
        "transactions_analyzed": len(eligible_debits),
        "average_monthly_income": avg_monthly_income,
        "conservative_monthly_income": conservative_monthly_income,
        "income_variability_cv": cv,
        "essential_living_expenses": essential_living_monthly,
        "necessary_business_expenses": business_monthly,
        "existing_loan_commitments": existing_loan_commitments,
        "upcoming_bills": upcoming_bills,
        "current_savings_buffer": current_savings_buffer,
        "total_monthly_outflows": total_monthly_outflows,
        "disposable_income_before_loan": disposable_income_before_loan,
        "conservative_disposable_before_loan": conservative_disposable_before_loan,
    }

def evaluate_loan_affordability(
    db: Session,
    user_id: str,
    loan_amount: float,
    annual_interest_rate: float,
    tenure_months: int,
    processing_fee: float = 0.0
) -> Dict[str, Any]:
    """
    Comprehensive Debt-Trap Prevention assessment.
    Tests proposed loan against verified base cash flows and a -25% gig-worker stress scenario.
    """
    baseline = get_user_affordability_baseline(db, user_id)
    emi_data = calculate_reducing_balance_emi(
        principal=loan_amount,
        annual_interest_rate=annual_interest_rate,
        tenure_months=tenure_months,
        processing_fee=processing_fee
    )

    monthly_emi = emi_data["monthly_emi"]
    total_interest = emi_data["total_interest"]
    total_repayment = emi_data["total_repayment"]

    avg_income = baseline["average_monthly_income"]
    conservative_income = baseline["conservative_monthly_income"]
    living_exp = baseline["essential_living_expenses"]
    biz_exp = baseline["necessary_business_expenses"]
    existing_debt = baseline["existing_loan_commitments"]
    bills = baseline["upcoming_bills"]
    disposable_before = baseline["disposable_income_before_loan"]

    # Base disposable buffer after proposed EMI
    disposable_after_emi = round(disposable_before - monthly_emi, 2)
    total_debt_commitments = round(existing_debt + monthly_emi, 2)
    foir_pct = round((total_debt_commitments / avg_income) * 100, 1) if avg_income > 0 else 100.0

    # Lower-Income Stress Scenario (e.g. 25% drop in gig income due to vehicle downtime or rainy season)
    stress_income = round(avg_income * 0.75, 2)
    stress_outflows_after_emi = round(living_exp + biz_exp + total_debt_commitments + bills, 2)
    stress_disposable_after_emi = round(stress_income - stress_outflows_after_emi, 2)
    stress_foir_pct = round((total_debt_commitments / stress_income) * 100, 1) if stress_income > 0 else 100.0

    reasons: List[str] = []

    # 1. Check Data Sufficiency
    if not baseline["is_sufficient"]:
        verdict = "INSUFFICIENT_DATA"
        reasons.append(
            f"Only {baseline['months_analyzed']} month(s) of verified statements ({baseline['transactions_analyzed']} transactions) on record. "
            "A minimum of 60 days of continuous transaction history across 2+ calendar months is required to assess borrowing safety."
        )
    # 2. Check Severe Unaffordability (Deficit or Extreme FOIR)
    elif disposable_after_emi < 0 or foir_pct > 50.0 or disposable_before <= 0:
        verdict = "NOT_AFFORDABLE"
        if disposable_after_emi < 0:
            deficit = abs(disposable_after_emi)
            reasons.append(
                f"Proposed EMI of ₹{monthly_emi:,.2f} creates an immediate monthly cash deficit of ₹{deficit:,.2f}. "
                f"Your total monthly expenses and debt obligations (₹{living_exp + biz_exp + total_debt_commitments + bills:,.2f}) will exceed your average income (₹{avg_income:,.2f})."
            )
        if foir_pct > 50.0:
            reasons.append(
                f"Debt payments will consume {foir_pct}% of your total earnings (existing debt ₹{existing_debt:,.2f} + new EMI ₹{monthly_emi:,.2f}). "
                "Financial safety guidelines recommend keeping total debt servicing strictly under 35–40%."
            )
        if disposable_before <= 0:
            reasons.append(
                f"You currently have a negative pre-loan surplus (disposable buffer: -₹{abs(disposable_before):,.2f}/month). "
                f"Because your existing monthly living and work expenses (₹{living_exp + biz_exp:,.2f}) and commitments (₹{existing_debt + bills:,.2f}) already exceed your monthly income (₹{avg_income:,.2f}), "
                "taking on any new borrowing (even a micro-loan of ₹1,000) creates an immediate cash shortage and cannot be safely approved."
            )
    # 3. Check Stress Test Failure or Elevated FOIR
    elif stress_disposable_after_emi < 0 or foir_pct > 35.0 or stress_foir_pct > 50.0:
        verdict = "PROCEED_WITH_CAUTION"
        if stress_disposable_after_emi < 0:
            reasons.append(
                f"Under a realistic 25% delivery earnings dip (earning ₹{stress_income:,.2f}/mo), you will face a monthly shortage of ₹{abs(stress_disposable_after_emi):,.2f}."
            )
        if foir_pct > 35.0:
            reasons.append(
                f"Total monthly debt servicing will reach {foir_pct}% of your earnings, leaving a tight margin of only ₹{disposable_after_emi:,.2f} for unforeseen emergencies."
            )
    # 4. Safe & Affordable
    else:
        verdict = "LIKELY_AFFORDABLE"
        reasons.append(
            f"Monthly EMI of ₹{monthly_emi:,.2f} leaves a healthy cash buffer of ₹{disposable_after_emi:,.2f}/month under normal earnings."
        )
        reasons.append(
            f"Even under a 25% drop in delivery payouts, your cash buffer remains positive at ₹{stress_disposable_after_emi:,.2f}/month."
        )
        reasons.append(
            f"Total debt obligations consume {foir_pct}% of your income, comfortably within the safe 35% threshold."
        )

    # Compute Safe Alternative Recommendations
    # Safe maximum EMI: 30% of average income minus existing debt commitments, capped at 60% of pre-loan disposable
    safe_max_emi = max(0.0, round(min(
        max(0.0, (avg_income * 0.30) - existing_debt),
        max(0.0, disposable_before * 0.50)
    ), 2)) if baseline["is_sufficient"] else 0.0

    # Calculate safe maximum loan amount given current rate & tenure
    if annual_interest_rate == 0.0:
        safe_max_loan = round(safe_max_emi * tenure_months, 2)
    else:
        r = (annual_interest_rate / 100.0) / 12.0
        n = tenure_months
        if r > 0 and ((1.0 + r) ** n - 1.0) > 0:
            safe_max_loan = round(safe_max_emi * (((1.0 + r) ** n - 1.0) / (r * ((1.0 + r) ** n))), 2)
        else:
            safe_max_loan = 0.0

    # Tenure comparisons: 12, 24, 36 months (or alternative tenures)
    tenure_comparisons = []
    for test_tenure in [6, 12, 18, 24, 36]:
        if test_tenure == tenure_months:
            continue
        try:
            comp_emi = calculate_reducing_balance_emi(loan_amount, annual_interest_rate, test_tenure, processing_fee)
            comp_disposable = round(disposable_before - comp_emi["monthly_emi"], 2)
            tenure_comparisons.append({
                "tenure_months": test_tenure,
                "monthly_emi": comp_emi["monthly_emi"],
                "total_interest": comp_emi["total_interest"],
                "total_repayment": comp_emi["total_repayment"],
                "monthly_disposable_after_emi": comp_disposable,
                "is_viable": comp_disposable >= 0 and baseline["is_sufficient"]
            })
        except Exception:
            pass

    # "Save First / Delay Borrowing" calculation
    # How many months of saving their positive disposable income would accumulate the loan amount with ZERO interest?
    if disposable_before > 0:
        months_to_save = math.ceil(loan_amount / disposable_before)
    else:
        months_to_save = None

    return {
        "verdict": verdict,
        "reasons": reasons,
        "loan_parameters": {
            "loan_amount": round(loan_amount, 2),
            "annual_interest_rate": round(annual_interest_rate, 2),
            "tenure_months": tenure_months,
            "processing_fee": round(processing_fee, 2)
        },
        "repayment_metrics": {
            "monthly_emi": monthly_emi,
            "total_interest": total_interest,
            "total_repayment": total_repayment,
            "monthly_disposable_before_loan": disposable_before,
            "monthly_disposable_after_emi": disposable_after_emi,
            "remaining_financial_buffer": disposable_after_emi,
            "total_debt_commitments": total_debt_commitments,
            "foir_percentage": foir_pct
        },
        "stress_test": {
            "stress_income": stress_income,
            "stress_disposable_after_emi": stress_disposable_after_emi,
            "stress_foir_percentage": stress_foir_pct,
            "passes_stress_test": stress_disposable_after_emi >= 0
        },
        "user_financial_profile": baseline,
        "safer_alternatives": {
            "safe_max_monthly_emi": safe_max_emi,
            "safe_max_loan_amount": safe_max_loan,
            "tenure_comparisons": tenure_comparisons,
            "save_first_months": months_to_save,
            "recommend_saving_first": verdict in ["NOT_AFFORDABLE", "PROCEED_WITH_CAUTION"]
        },
        "disclaimer": (
            "SahayakFin Debt-Trap Prevention Engine provides financial decision support based on your verified statement cash flows. "
            "This is not a guarantee of credit approval or a formal underwriting decision."
        )
    }
