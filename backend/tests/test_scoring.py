import pytest
from decimal import Decimal
from datetime import date
from app.models.entities import Transaction
from app.scoring.engine import calculate_financial_trust_score

def test_empty_transactions_yields_insufficient_data():
    res = calculate_financial_trust_score([])
    assert res["score"] is None
    assert res["status"] == "INSUFFICIENT_DATA"
    assert res["months_of_data"] == 0

def test_single_month_yields_insufficient_data():
    t1 = Transaction(
        id="T1",
        user_id="U1",
        transaction_date=date(2026, 10, 1),
        description="Payout",
        amount=Decimal("10000"),
        transaction_type="CREDIT",
        category="GIG_PAYOUT",
        status="SUCCESS",
        is_refund=False,
        is_duplicate_test=False,
        is_excluded_from_scoring=False
    )
    res = calculate_financial_trust_score([t1])
    assert res["score"] is None
    assert res["status"] == "INSUFFICIENT_DATA"
    assert res["months_of_data"] == 1

def test_multi_month_deterministic_scoring():
    # 3 distinct months of steady income and normal expenses
    txns = []
    for m in [8, 9, 10]:
        txns.append(Transaction(
            id=f"T-CR-{m}",
            user_id="U1",
            transaction_date=date(2026, m, 5),
            description="Weekly Payout",
            amount=Decimal("25000"),
            transaction_type="CREDIT",
            category="GIG_PAYOUT",
            status="SUCCESS",
            is_refund=False,
            is_duplicate_test=False,
            is_excluded_from_scoring=False
        ))
        txns.append(Transaction(
            id=f"T-DR-{m}",
            user_id="U1",
            transaction_date=date(2026, m, 15),
            description="Fuel Refill",
            amount=Decimal("5000"),
            transaction_type="DEBIT",
            category="FUEL_BUSINESS",
            status="SUCCESS",
            is_refund=False,
            is_duplicate_test=False,
            is_excluded_from_scoring=False
        ))
        txns.append(Transaction(
            id=f"T-BILL-{m}",
            user_id="U1",
            transaction_date=date(2026, m, 20),
            description="Mobile Recharge",
            amount=Decimal("299"),
            transaction_type="DEBIT",
            category="UTILITIES_BILL",
            status="SUCCESS",
            is_refund=False,
            is_duplicate_test=False,
            is_excluded_from_scoring=False
        ))

    res = calculate_financial_trust_score(txns)
    assert res["score"] is not None
    assert 60 <= res["score"] <= 100
    assert res["status"] == "SUFFICIENT"
    assert res["months_of_data"] == 3
    assert res["components"]["incomeStability"]["score"] is not None
    assert res["components"]["savingsConsistency"]["score"] is not None
    assert res["components"]["expenseHealth"]["score"] is not None
    assert res["components"]["billPaymentConsistency"]["score"] is not None

def test_refunds_and_duplicate_tests_are_excluded():
    tx_refund = Transaction(
        id="T-REFUND",
        user_id="U1",
        transaction_date=date(2026, 10, 5),
        description="Refund Entry",
        amount=Decimal("50000"),
        transaction_type="CREDIT",
        category="REFUND",
        status="SUCCESS",
        is_refund=True,
        is_duplicate_test=False,
        is_excluded_from_scoring=False
    )
    tx_dup = Transaction(
        id="T-DUP",
        user_id="U1",
        transaction_date=date(2026, 10, 5),
        description="Duplicate Test Row",
        amount=Decimal("50000"),
        transaction_type="CREDIT",
        category="GIG_PAYOUT",
        status="SUCCESS",
        is_refund=False,
        is_duplicate_test=True,
        is_excluded_from_scoring=True
    )
    res = calculate_financial_trust_score([tx_refund, tx_dup])
    # Both are excluded -> treated as 0 valid transactions
    assert res["score"] is None
    assert res["status"] == "INSUFFICIENT_DATA"
