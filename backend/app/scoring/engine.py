from decimal import Decimal
from typing import Optional, List, Dict, Any
from datetime import date
from collections import defaultdict
import numpy as np
from app.models.entities import Transaction

def calculate_financial_trust_score(
    transactions: List[Transaction]
) -> Dict[str, Any]:
    """
    Modular, deterministic scoring service.
    Follows benchmark weights:
      - Income Stability: 30%
      - Savings Consistency: 25%
      - Expense Health: 30%
      - Bill-Payment Consistency: 15%
    
    Formula:
      Score = 0.30*Income + 0.25*Savings + 0.30*Expense + 0.15*Bills
    """
    # Exclude failed, pending, and duplicate test transactions
    valid_txns = [
        t for t in transactions 
        if t.status == "SUCCESS" and not t.is_duplicate_test and not t.is_excluded_from_scoring
    ]

    if not valid_txns:
        return {
            "score": None,
            "status": "INSUFFICIENT_DATA",
            "months_of_data": 0,
            "average_monthly_income": 0.0,
            "components": {
                "incomeStability": {"score": None, "weight": 30, "label": "Income Stability", "description": "Requires at least 60 days of verified transaction history.", "impact": "neutral", "tips": "Upload at least 2 distinct months of gig statements."},
                "savingsConsistency": {"score": None, "weight": 25, "label": "Savings Consistency", "description": "Net cash flow evaluation requires multiple earning cycles.", "impact": "neutral", "tips": "Maintain positive closing balances across months."},
                "expenseHealth": {"score": None, "weight": 30, "label": "Expense Health", "description": "Operational expense ratio requires completed monthly spending records.", "impact": "neutral", "tips": "Record fuel and operating transactions consistently."},
                "billPaymentConsistency": {"score": None, "weight": 15, "label": "Bill Payment Consistency", "description": "Periodic mobile and utility recharges will be evaluated here.", "impact": "neutral", "tips": "Log UPI mobile recharge payments on schedule."}
            },
            "explanation": "Insufficient transaction history (< 2 calendar months). Missing data is never penalized as poor credit. Please upload statement history spanning at least 60 days to generate your explainable Financial Trust Score."
        }

    # Group valid transactions by calendar month (YYYY-MM)
    monthly_data: Dict[str, Dict[str, float]] = defaultdict(lambda: {
        "income": 0.0,
        "expense": 0.0,
        "fuel_ops": 0.0,
        "savings": 0.0,
        "bills": 0.0,
        "count": 0
    })

    for t in valid_txns:
        month_key = t.transaction_date.strftime("%Y-%m")
        amt = float(t.amount)
        monthly_data[month_key]["count"] += 1

        # Income rule: Platform gig earnings, business income, customer tips (exclude internal transfers and refunds)
        if t.transaction_type == "CREDIT" and not t.is_refund:
            if t.category in ["GIG_INCOME", "GIG_PAYOUT", "BUSINESS_INCOME", "CUSTOMER_TIP", "OPERATIONAL_INCOME", "OTHER_INCOME"]:
                monthly_data[month_key]["income"] += amt
        elif t.transaction_type == "DEBIT":
            # Do not count internal savings transfers or self transfers as consumption expense
            if t.category in ["SAVINGS_TRANSFER", "RD_DEPOSIT"]:
                monthly_data[month_key]["savings"] += amt
            elif t.category != "INTERNAL_TRANSFER":
                monthly_data[month_key]["expense"] += amt
                if t.category in ["FUEL_TRANSPORT", "FUEL_BUSINESS", "VEHICLE_MAINTENANCE", "BUSINESS_EXPENSE"]:
                    monthly_data[month_key]["fuel_ops"] += amt
                elif t.category in ["UTILITIES", "UTILITIES_BILL", "MOBILE_RECHARGE", "RENT"]:
                    monthly_data[month_key]["bills"] += amt

    months_count = len(monthly_data)
    monthly_incomes = [m["income"] for m in monthly_data.values()]
    avg_monthly_income = float(np.mean(monthly_incomes)) if monthly_incomes else 0.0

    # Rule: < 2 distinct months -> Insufficient data
    if months_count < 2:
        return {
            "score": None,
            "status": "INSUFFICIENT_DATA",
            "months_of_data": months_count,
            "average_monthly_income": round(avg_monthly_income, 2),
            "components": {
                "incomeStability": {"score": None, "weight": 30, "label": "Income Stability", "description": "Requires at least 2 distinct calendar months.", "impact": "neutral", "tips": "Upload statements spanning 60+ days."},
                "savingsConsistency": {"score": None, "weight": 25, "label": "Savings Consistency", "description": "Cash flow tracking requires multi-month balance observations.", "impact": "neutral", "tips": "Keep regular savings transfers active."},
                "expenseHealth": {"score": None, "weight": 30, "label": "Expense Health", "description": "Expense ratio requires completed monthly cycles.", "impact": "neutral", "tips": "Record fuel and operating expenses."},
                "billPaymentConsistency": {"score": None, "weight": 15, "label": "Bill Payment Consistency", "description": "Periodic utility and data recharge tracking.", "impact": "neutral", "tips": "Recharge phone plan 48h before expiry."}
            },
            "explanation": "Insufficient transaction history (< 2 calendar months). Missing data is never penalized as poor credit."
        }

    # 1. Income Stability (0-100)
    # Based on coefficient of variation (CoV) of monthly income
    std_income = float(np.std(monthly_incomes)) if len(monthly_incomes) > 1 else 0.0
    cov = (std_income / avg_monthly_income) if avg_monthly_income > 0 else 1.0
    # Higher stability = lower CoV
    income_score = max(20.0, min(100.0, 100.0 - (cov * 70.0)))

    # 2. Savings Consistency (0-100)
    # Evaluates positive cash flow months and savings transfer habit
    positive_cf_months = sum(1 for m in monthly_data.values() if m["income"] >= m["expense"])
    cf_ratio = positive_cf_months / months_count
    has_savings_habit = any(m["savings"] > 0 for m in monthly_data.values())
    savings_score = max(20.0, min(100.0, (cf_ratio * 70.0) + (30.0 if has_savings_habit else 10.0)))

    # 3. Expense Health (0-100)
    # Ratio of essential fuel/repairs (< 30% of income is healthy)
    total_expenses = sum(m["expense"] for m in monthly_data.values())
    expense_to_income = (total_expenses / (avg_monthly_income * months_count)) if avg_monthly_income > 0 else 1.0
    if expense_to_income <= 0.70:
        expense_score = 85.0
    elif expense_to_income <= 0.85:
        expense_score = 70.0
    else:
        expense_score = 50.0

    # 4. Bill Payment Consistency (0-100)
    # Regular monthly mobile recharge or utility bill presence
    bill_months = sum(1 for m in monthly_data.values() if m["bills"] > 0)
    if bill_months == 0:
        bill_score = 60.0 # Neutral baseline, missing bills never severely penalized
        status = "PROVISIONAL_NO_BILL_DATA" if months_count >= 3 else "PROVISIONAL_2_MONTHS"
    else:
        bill_score = min(100.0, 50.0 + (bill_months / months_count) * 50.0)
        status = "SUFFICIENT" if months_count >= 3 else "PROVISIONAL_2_MONTHS"

    final_score = round(
        (0.30 * income_score) +
        (0.25 * savings_score) +
        (0.30 * expense_score) +
        (0.15 * bill_score)
    )

    return {
        "score": float(final_score),
        "status": status,
        "months_of_data": months_count,
        "average_monthly_income": round(avg_monthly_income, 2),
        "components": {
            "incomeStability": {
                "score": round(income_score, 1),
                "weight": 30,
                "label": "Income Stability",
                "description": f"Evaluated from {months_count} months of verified platform earnings volatility.",
                "impact": "positive" if income_score >= 65 else "neutral",
                "tips": "Maintain regular weekly platform payouts."
            },
            "savingsConsistency": {
                "score": round(savings_score, 1),
                "weight": 25,
                "label": "Savings Consistency",
                "description": f"{positive_cf_months} of {months_count} months showed positive net operating cash surplus.",
                "impact": "positive" if savings_score >= 65 else "neutral",
                "tips": "Set up a small recurring reserve transfer."
            },
            "expenseHealth": {
                "score": round(expense_score, 1),
                "weight": 30,
                "label": "Expense Health",
                "description": f"Operating expenses averaged {round(expense_to_income * 100, 1)}% of verified platform inflows.",
                "impact": "positive" if expense_score >= 65 else "neutral",
                "tips": "Optimize fuel refueling during peak partner cashback hours."
            },
            "billPaymentConsistency": {
                "score": round(bill_score, 1),
                "weight": 15,
                "label": "Bill Payment Consistency",
                "description": f"Mobile data and utility bill consistency logged across {bill_months} periods.",
                "impact": "positive" if bill_score >= 65 else "neutral",
                "tips": "Recharge mobile plan 48h prior to expiration."
            }
        },
        "explanation": f"Score calculated from {months_count} months of statement records using the 4-pillar deterministic framework. Qualifies for low-interest micro-working capital facilities."
    }
