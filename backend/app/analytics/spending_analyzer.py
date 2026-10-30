"""
Personalized Spending Analyzer for SahayakFin.
Analyzes user-specific verified transactions, calculates category totals, trends,
identifies realistic savings opportunities without judgmental labels, and
computes monthly spending limits and potential annual savings.
"""
from typing import List, Dict, Any, Optional, Tuple
from datetime import date, datetime
from decimal import Decimal
from collections import defaultdict
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.entities import Transaction, BudgetRecommendation, SavingsGoal

CATEGORY_PRETTY_LABELS = {
    "FUEL_TRANSPORT": "Fuel & Transport",
    "FOOD_GROCERIES": "Food & Dining",
    "UTILITIES": "Utilities & Recharges",
    "HEALTHCARE": "Healthcare & Medical",
    "BUSINESS_EXPENSE": "Business Operations",
    "OTHER_EXPENSE": "Personal & Peer Transfers",
    "OTHER": "Other Outflows",
}

# Constructive, non-judgmental explanations for savings opportunities
# Note: Business operations and essential equipment/maintenance are intentionally preserved
# without arbitrary cuts to protect worker earnings.
OPPORTUNITY_TEMPLATES = {
    "FOOD_GROCERIES": {
        "reason": "Food and daily refreshments account for an opportunity to optimize earnings. Preparing home tiffin packs and batching daily grocery stops could comfortably trim discretionary dining without lifestyle compromise.",
        "savings_ratio": 0.15, # Realistic 15% trim
    },
    "FUEL_TRANSPORT": {
        "reason": "Fuel is an essential operational necessity for delivery shifts. Strategic route clustering, minimizing idle cruising, and loyalty pump rewards can unlock 8–10% in fuel savings while maintaining delivery volume.",
        "savings_ratio": 0.10, # Realistic 10% trim
    },
    "OTHER_EXPENSE": {
        "reason": "Frequent ad-hoc peer transfers and unassigned UPI micro-debits add up over the month. Setting an intentional weekly cash transfer ceiling can prevent buffer leakage.",
        "savings_ratio": 0.18, # Realistic 18% trim
    },
    "UTILITIES": {
        "reason": "Telecom and mobile recharge costs can be optimized by picking 84-day or annual gig partner corporate data packs rather than higher-cost 28-day daily add-on packs.",
        "savings_ratio": 0.12, # Realistic 12% trim
    }
}

def is_self_transfer_desc(desc: Optional[str]) -> bool:
    """Detect whether a transaction description represents a transfer between user's own accounts."""
    if not desc:
        return False
    d = desc.lower().strip()
    return any(k in d for k in (
        "self transfer", "own account", "to self", "from self", 
        "internal transfer", "transfer to own", "transfer from own"
    ))

def is_loan_proceeds_desc(desc: Optional[str]) -> bool:
    """Detect whether a credit description represents loan disbursement or borrowed funds."""
    if not desc:
        return False
    d = desc.lower().strip()
    return any(k in d for k in (
        "loan disburs", "credit line", "loan credit", "sanction amount", "borrowing"
    ))

def analyze_user_spending(db: Session, user_id: str) -> Dict[str, Any]:
    """
    Perform a complete, user-isolated spending analysis on authenticated user's transactions.
    Strictly filters out internal self-transfers, loan proceeds, reversals, and unconfirmed items.
    """
    txns = db.query(Transaction).filter(
        Transaction.user_id == user_id,
        Transaction.status == "SUCCESS",
        Transaction.is_duplicate_test == False,
        Transaction.is_excluded_from_scoring == False
    ).order_by(Transaction.transaction_date.asc()).all()

    # Filter out non-spending transactions:
    # 1. Do not count self-transfers as consumption expenses or earned income.
    # 2. Exclude loan proceeds from earned income.
    # 3. Handle refunds/reversals properly: exclude from income/consumption.
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

    # Group by month
    monthly_inflow = defaultdict(float)
    monthly_outflow = defaultdict(float)
    monthly_category_spend = defaultdict(lambda: defaultdict(float))
    all_months = set()

    for t in eligible_credits:
        m_key = t.transaction_date.strftime("%Y-%m")
        all_months.add(m_key)
        monthly_inflow[m_key] += float(t.amount)

    for t in eligible_debits:
        m_key = t.transaction_date.strftime("%Y-%m")
        all_months.add(m_key)
        monthly_outflow[m_key] += float(t.amount)
        cat_key = t.category.upper()
        monthly_category_spend[m_key][cat_key] += float(t.amount)

    sorted_months = sorted(list(all_months))
    months_count = len(sorted_months)

    # Data sufficiency evaluation
    is_sufficient = months_count >= 2 and len(eligible_debits) >= 4
    if not is_sufficient:
        if months_count == 0 or len(eligible_debits) == 0:
            sufficiency_note = "No completed transactions recorded yet. Ingest a verified bank or UPI statement to activate personalized spending analytics."
        else:
            sufficiency_note = f"Spending patterns are preliminary ({months_count} month recorded, {len(eligible_debits)} debits). A minimum of 60 days of continuous transaction history across 2+ calendar months is required for predictive spending modeling."
    else:
        sufficiency_note = f"Verified across {months_count} months of authentic transactions ({len(eligible_debits)} debits analyzed)."

    # Compute multi-month averages
    total_income = sum(monthly_inflow.values())
    total_expenses = sum(monthly_outflow.values())
    avg_income = round(total_income / months_count, 2) if months_count > 0 else 0.0
    avg_expenses = round(total_expenses / months_count, 2) if months_count > 0 else 0.0
    net_savings = round(avg_income - avg_expenses, 2)
    savings_rate_pct = round((net_savings / avg_income) * 100, 1) if avg_income > 0 else 0.0

    # Aggregate category totals across all data
    category_all_totals = defaultdict(float)
    for m_key in sorted_months:
        for cat, amt in monthly_category_spend[m_key].items():
            category_all_totals[cat] += amt

    # Determine latest month vs prior month for trends
    latest_month = sorted_months[-1] if sorted_months else None
    prior_month = sorted_months[-2] if len(sorted_months) >= 2 else None

    category_items = []
    total_potential_monthly_savings = 0.0

    for cat_raw, total_cat_amt in sorted(category_all_totals.items(), key=lambda x: x[1], reverse=True):
        cat_key = cat_raw.upper()
        label = CATEGORY_PRETTY_LABELS.get(cat_key, cat_raw.replace("_", " ").title())
        avg_cat_spend = round(total_cat_amt / months_count, 2) if months_count > 0 else 0.0
        
        # Spend percentages
        pct_expenses = round((avg_cat_spend / avg_expenses) * 100, 1) if avg_expenses > 0 else 0.0
        pct_income = round((avg_cat_spend / avg_income) * 100, 1) if avg_income > 0 else 0.0

        # Trend calculation
        if latest_month and prior_month:
            latest_spend = monthly_category_spend[latest_month].get(cat_key, 0.0)
            prior_spend = monthly_category_spend[prior_month].get(cat_key, 0.0)
            diff = latest_spend - prior_spend
            if diff > 100.0:
                trend = "INCREASING"
            elif diff < -100.0:
                trend = "DECREASING"
            else:
                trend = "STABLE"
        else:
            trend = "STABLE"

        # Check if opportunity template applies
        template = OPPORTUNITY_TEMPLATES.get(cat_key)
        is_opportunity = False
        suggested_limit = None
        potential_savings = None
        explanation = None
        needs_review = False

        if cat_key in ("OTHER", "UNCATEGORIZED", "UNKNOWN"):
            needs_review = True

        # Do not recommend arbitrary cuts to essential business operations
        if cat_key == "BUSINESS_EXPENSE":
            is_opportunity = False
            suggested_limit = None
            potential_savings = None
            explanation = f"{label} is an essential operational necessity for work stability. Maintained safely without arbitrary cuts."
        elif template and avg_cat_spend > 500.0:
            is_opportunity = True
            trim_pct = template["savings_ratio"]
            potential_savings = round(avg_cat_spend * trim_pct, 2)
            suggested_limit = round(avg_cat_spend - potential_savings, 2)
            total_potential_monthly_savings += potential_savings
            explanation = template["reason"]
        elif cat_key != "BUSINESS_EXPENSE" and avg_cat_spend > (avg_income * 0.15) and avg_income > 0:
            # Generic opportunity for any discretionary category consuming >15% of total income
            is_opportunity = True
            potential_savings = round(avg_cat_spend * 0.10, 2)
            suggested_limit = round(avg_cat_spend - potential_savings, 2)
            total_potential_monthly_savings += potential_savings
            explanation = f"{label} accounts for {pct_income}% of your platform earnings. A modest 10% buffer adjustment will strengthen your emergency reserves without impacting necessary operations."

        category_items.append({
            "category": cat_key,
            "category_label": label,
            "current_monthly_spend": avg_cat_spend,
            "percentage_of_expenses": pct_expenses,
            "percentage_of_income": pct_income,
            "monthly_trend": trend,
            "is_opportunity": is_opportunity,
            "suggested_monthly_limit": suggested_limit,
            "potential_monthly_savings": potential_savings,
            "opportunity_explanation": explanation,
            "needs_review": needs_review
        })

    total_potential_annual_savings = round(total_potential_monthly_savings * 12, 2)

    if months_count >= 2:
        reporting_period_label = f"Monthly average based on past {months_count} months of statements"
    elif months_count == 1:
        reporting_period_label = "Past 30 days of statements"
    else:
        reporting_period_label = "No statements uploaded yet"

    return {
        "months_analyzed": months_count,
        "is_sufficient": is_sufficient,
        "sufficiency_note": sufficiency_note,
        "average_monthly_income": avg_income,
        "average_monthly_expenses": avg_expenses,
        "net_monthly_savings": net_savings,
        "savings_rate_pct": savings_rate_pct,
        "category_breakdown": category_items,
        "potential_total_monthly_savings": round(total_potential_monthly_savings, 2),
        "potential_total_annual_savings": total_potential_annual_savings,
        "latest_month_spend": monthly_category_spend[latest_month] if latest_month else {},
        "reporting_period_label": reporting_period_label
    }

def sync_user_budget_recommendations(db: Session, user_id: str) -> List[BudgetRecommendation]:
    """
    Ensure database records in `budget_recommendations` reflect the latest verified transaction analysis.
    Preserves existing user decisions (ACCEPTED / DISMISSED) and linked goals.
    """
    analysis = analyze_user_spending(db, user_id)
    existing_recs = {
        r.category: r 
        for r in db.query(BudgetRecommendation).filter(BudgetRecommendation.user_id == user_id).all()
    }

    results = []
    for item in analysis["category_breakdown"]:
        if not item["is_opportunity"] or item["suggested_monthly_limit"] is None:
            continue

        cat = item["category"]
        if cat in existing_recs:
            rec = existing_recs[cat]
            # Update current spend & expected savings while preserving user status/limit if accepted
            rec.current_monthly_spend = Decimal(str(item["current_monthly_spend"]))
            if rec.status == "PENDING":
                rec.suggested_monthly_limit = Decimal(str(item["suggested_monthly_limit"]))
                rec.expected_monthly_savings = Decimal(str(item["potential_monthly_savings"]))
                rec.expected_annual_savings = Decimal(str(round(item["potential_monthly_savings"] * 12, 2)))
                rec.reason = item["opportunity_explanation"] or rec.reason
            results.append(rec)
        else:
            new_rec = BudgetRecommendation(
                user_id=user_id,
                category=cat,
                category_label=item["category_label"],
                current_monthly_spend=Decimal(str(item["current_monthly_spend"])),
                suggested_monthly_limit=Decimal(str(item["suggested_monthly_limit"])),
                expected_monthly_savings=Decimal(str(item["potential_monthly_savings"])),
                expected_annual_savings=Decimal(str(round(item["potential_monthly_savings"] * 12, 2))),
                reason=item["opportunity_explanation"] or "Optimized spending limit based on income and cash-flow history.",
                status="PENDING"
            )
            db.add(new_rec)
            results.append(new_rec)

    db.commit()
    return results

def get_budget_tracking(db: Session, user_id: str) -> List[Dict[str, Any]]:
    """
    Retrieve active recommendations with live tracking against actual current-month spending.
    """
    recs = sync_user_budget_recommendations(db, user_id)
    analysis = analyze_user_spending(db, user_id)
    latest_spend_map = analysis.get("latest_month_spend", {})

    # Fetch user goals to provide linked goal names
    goals_map = {
        g.id: g.goal_name
        for g in db.query(SavingsGoal).filter(SavingsGoal.user_id == user_id).all()
    }

    tracking_list = []
    for r in recs:
        actual_spend = latest_spend_map.get(r.category, float(r.current_monthly_spend))
        suggested_limit = float(r.suggested_monthly_limit)
        is_over = actual_spend > suggested_limit

        tracking_list.append({
            "id": r.id,
            "category": r.category,
            "category_label": r.category_label,
            "current_monthly_spend": float(r.current_monthly_spend),
            "suggested_monthly_limit": suggested_limit,
            "expected_monthly_savings": float(r.expected_monthly_savings),
            "expected_annual_savings": float(r.expected_annual_savings),
            "reason": r.reason,
            "status": r.status,
            "linked_goal_id": r.linked_goal_id,
            "linked_goal_name": goals_map.get(r.linked_goal_id) if r.linked_goal_id else None,
            "actual_current_spend": round(actual_spend, 2),
            "is_over_budget": is_over
        })

    return tracking_list
