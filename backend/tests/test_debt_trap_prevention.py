"""
Integration and Unit Tests for SahayakFin Debt-Trap Prevention Engine
"""
import uuid
import io
import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.analytics.loan_affordability import (
    calculate_reducing_balance_emi,
    evaluate_loan_affordability,
    get_user_affordability_baseline
)

client = TestClient(app)

def create_user(prefix: str):
    email = f"{prefix}_{uuid.uuid4().hex[:6]}@sahayakfin.in"
    res = client.post("/api/auth/register", json={
        "full_name": f"Tester {prefix}",
        "email": email,
        "phone": "+919876543210",
        "worker_type": "DELIVERY_PARTNER",
        "city": "Bengaluru",
        "password": "SecurePassword123"
    })
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"email": email, "token": token, "headers": {"Authorization": f"Bearer {token}"}}

def test_reducing_balance_emi_and_zero_interest_calculations():
    # 1. Standard 12-month loan at 12% APR, ₹10,000 principal
    res = calculate_reducing_balance_emi(
        principal=10000.0,
        annual_interest_rate=12.0,
        tenure_months=12,
        processing_fee=200.0
    )
    # Standard formula: r = 0.01, E = 10000 * 0.01 * (1.01^12) / (1.01^12 - 1) = 888.49
    assert abs(res["monthly_emi"] - 888.49) <= 0.50
    assert abs(res["total_repayment"] - (res["monthly_emi"] * 12 + 200.0)) <= 0.50
    assert res["processing_fee"] == 200.0

    # 2. Zero-Interest Loan
    zero_res = calculate_reducing_balance_emi(
        principal=12000.0,
        annual_interest_rate=0.0,
        tenure_months=6,
        processing_fee=150.0
    )
    assert zero_res["monthly_emi"] == 2000.0
    assert zero_res["total_interest"] == 0.0
    assert zero_res["total_repayment"] == 12150.0

    # 3. Invalid inputs validation
    with pytest.raises(ValueError):
        calculate_reducing_balance_emi(-5000, 12.0, 12)
    with pytest.raises(ValueError):
        calculate_reducing_balance_emi(5000, 12.0, 0)
    with pytest.raises(ValueError):
        calculate_reducing_balance_emi(5000, -5.0, 12)

def test_affordability_insufficient_data():
    user = create_user("no_data_borrower")
    res = client.get("/api/loans/affordability-baseline", headers=user["headers"])
    assert res.status_code == 200
    data = res.json()
    assert data["is_sufficient"] is False
    assert data["months_analyzed"] == 0

    # Attempt check
    check_res = client.post("/api/loans/affordability-check", headers=user["headers"], json={
        "loan_amount": 25000.0,
        "annual_interest_rate": 15.0,
        "tenure_months": 12,
        "processing_fee": 300.0
    })
    assert check_res.status_code == 200
    check_data = check_res.json()
    assert check_data["verdict"] == "INSUFFICIENT_DATA"
    assert any("60 days" in r for r in check_data["reasons"])

def test_affordability_not_affordable_excessive_borrowing():
    user = create_user("modest_earner")
    headers = user["headers"]

    # Upload multi-month income: ~₹15,000/mo, expenses: ~₹12,000/mo, surplus: ~₹3,000/mo
    csv_data = (
        "Date,Description,Amount,Type\n"
        "2026-08-01,Zomato Weekly Payout,15000.00,Credit\n"
        "2026-08-10,Mess Food & Groceries,6000.00,Debit\n"
        "2026-08-15,Fuel Petrol Refill,4000.00,Debit\n"
        "2026-08-20,Airtel Recharge,2000.00,Debit\n"
        "2026-09-01,Zomato Weekly Payout,15000.00,Credit\n"
        "2026-09-10,Mess Food & Groceries,6000.00,Debit\n"
        "2026-09-15,Fuel Petrol Refill,4000.00,Debit\n"
        "2026-09-20,Airtel Recharge,2000.00,Debit\n"
    ).encode("utf-8")
    client.post("/api/statements/import", headers=headers, files={"file": ("stmt.csv", io.BytesIO(csv_data), "text/csv")})

    # Test excessive loan: ₹3,00,000 for 12 months at 18% APR
    check_res = client.post("/api/loans/affordability-check", headers=headers, json={
        "loan_amount": 300000.0,
        "annual_interest_rate": 18.0,
        "tenure_months": 12,
        "processing_fee": 2500.0
    })
    assert check_res.status_code == 200
    data = check_res.json()
    assert data["verdict"] == "NOT_AFFORDABLE"
    assert data["repayment_metrics"]["monthly_disposable_after_emi"] < 0
    assert any("deficit" in r.lower() or "exceed" in r.lower() for r in data["reasons"])
    assert data["safer_alternatives"]["recommend_saving_first"] is True

def test_affordability_likely_affordable_and_stress_test():
    user = create_user("healthy_earner")
    headers = user["headers"]

    # Upload multi-month income: ~₹40,000/mo, expenses: ~₹15,000/mo, surplus: ~₹25,000/mo
    csv_data = (
        "Date,Description,Amount,Type\n"
        "2026-08-01,Zomato Payout,40000.00,Credit\n"
        "2026-08-10,Food Dining Mess,8000.00,Debit\n"
        "2026-08-15,Fuel HPCL Refill,5000.00,Debit\n"
        "2026-08-20,Utilities Bill,2000.00,Debit\n"
        "2026-09-01,Zomato Payout,40000.00,Credit\n"
        "2026-09-10,Food Dining Mess,8000.00,Debit\n"
        "2026-09-15,Fuel BPCL Refill,5000.00,Debit\n"
        "2026-09-20,Utilities Bill,2000.00,Debit\n"
    ).encode("utf-8")
    client.post("/api/statements/import", headers=headers, files={"file": ("stmt.csv", io.BytesIO(csv_data), "text/csv")})

    # Small loan: ₹10,000 for 12 months at 12% APR (EMI ~₹888/mo vs ₹25,000 buffer)
    check_res = client.post("/api/loans/affordability-check", headers=headers, json={
        "loan_amount": 10000.0,
        "annual_interest_rate": 12.0,
        "tenure_months": 12,
        "processing_fee": 100.0
    })
    assert check_res.status_code == 200
    data = check_res.json()
    assert data["verdict"] == "LIKELY_AFFORDABLE"
    assert data["stress_test"]["passes_stress_test"] is True
    assert data["repayment_metrics"]["foir_percentage"] <= 35.0
    assert len(data["safer_alternatives"]["tenure_comparisons"]) > 0

def test_debt_trap_chatbot_queries():
    user = create_user("chatbot_borrower")
    headers = user["headers"]

    csv_data = (
        "Date,Description,Amount,Type\n"
        "2026-08-01,Delivery Payout,25000.00,Credit\n"
        "2026-08-10,Food Dhaba,6000.00,Debit\n"
        "2026-08-15,Fuel Refill,4000.00,Debit\n"
        "2026-08-20,Mobile Recharge,1000.00,Debit\n"
        "2026-09-01,Delivery Payout,25000.00,Credit\n"
        "2026-09-10,Food Dhaba,6000.00,Debit\n"
        "2026-09-15,Fuel Refill,4000.00,Debit\n"
        "2026-09-20,Mobile Recharge,1000.00,Debit\n"
    ).encode("utf-8")
    client.post("/api/statements/import", headers=headers, files={"file": ("stmt.csv", io.BytesIO(csv_data), "text/csv")})

    # 1. Ask: "Can I borrow ₹3,00,000 on my current income?"
    res_large = client.post("/api/coach/chat", headers=headers, json={
        "message": "Can I borrow ₹3,00,000 on my current income?"
    })
    assert res_large.status_code == 200
    reply_large = res_large.json()["reply"]
    assert ("not affordable" in reply_large.lower() or "300,000" in reply_large or "3,00,000" in reply_large)

    # 2. Ask: "What EMI can I safely afford?"
    res_emi = client.post("/api/coach/chat", headers=headers, json={
        "message": "What EMI can I safely afford?"
    })
    assert res_emi.status_code == 200
    reply_emi = res_emi.json()["reply"]
    assert "safe" in reply_emi.lower() or "emi" in reply_emi.lower()

    # 3. Ask: "What if my income falls by 25%?"
    res_stress = client.post("/api/coach/chat", headers=headers, json={
        "message": "What if my income falls by 25%?"
    })
    assert res_stress.status_code == 200
    reply_stress = res_stress.json()["reply"]
    assert ("25%" in reply_stress or "stress" in reply_stress.lower())

    # 4. Ask: "Should I borrow or save first?"
    res_save = client.post("/api/coach/chat", headers=headers, json={
        "message": "Should I borrow or save first?"
    })
    assert res_save.status_code == 200
    reply_save = res_save.json()["reply"]
    assert "save first" in reply_save.lower() or "बचत" in reply_save

def test_conservative_income_calculation_handles_partial_boundary_months():
    user = create_user("partial_month_user")
    headers = user["headers"]

    # Simulate statement spanning Sep 29 to Oct 29 (31 days total)
    # September 29-30 (2 days): small credit of ₹410, debit of ₹1,140
    # October 1-29: credits of ₹92,978, debits of ₹98,912
    csv_data = (
        "Date,Description,Amount,Type\n"
        "2026-09-29,Mess food,220.00,Debit\n"
        "2026-09-29,Received from friend,110.00,Credit\n"
        "2026-09-30,Snacks bistro,920.00,Debit\n"
        "2026-09-30,UPI payout,300.00,Credit\n"
        "2026-10-05,Platform gig payout,46489.00,Credit\n"
        "2026-10-10,Living groceries,49000.00,Debit\n"
        "2026-10-15,Platform gig payout,46489.50,Credit\n"
        "2026-10-20,Vehicle fuel and servicing,49912.44,Debit\n"
    ).encode("utf-8")
    client.post("/api/statements/import", headers=headers, files={"file": ("stmt.csv", io.BytesIO(csv_data), "text/csv")})

    res = client.get("/api/loans/affordability-baseline", headers=headers)
    assert res.status_code == 200
    baseline = res.json()
    assert baseline["is_sufficient"] is True
    # Average monthly income across the 2 calendar buckets: (410 + 92978.50) / 2 = ~46694.25
    assert abs(baseline["average_monthly_income"] - 46694.25) <= 1.0
    # Conservative income MUST NOT be dragged down to raw ₹410 from the 2-day partial month!
    assert baseline["conservative_monthly_income"] > 10000.0
    assert abs(baseline["conservative_monthly_income"] - (baseline["average_monthly_income"] * 0.85)) <= 5.0
    # Negative pre-loan surplus: outgoings > inflows
    assert baseline["disposable_income_before_loan"] < 0

def test_negative_pre_loan_surplus_rejects_both_small_and_large_loans():
    user = create_user("deficit_borrower")
    headers = user["headers"]

    # User whose verified expenses exceed income: income ₹20,000/mo, expenses ₹24,000/mo
    csv_data = (
        "Date,Description,Amount,Type\n"
        "2026-08-01,Gig Payout,20000.00,Credit\n"
        "2026-08-10,Living Expense,14000.00,Debit\n"
        "2026-08-15,Fuel and Bike Ops,10000.00,Debit\n"
        "2026-09-01,Gig Payout,20000.00,Credit\n"
        "2026-09-10,Living Expense,14000.00,Debit\n"
        "2026-09-15,Fuel and Bike Ops,10000.00,Debit\n"
    ).encode("utf-8")
    client.post("/api/statements/import", headers=headers, files={"file": ("stmt.csv", io.BytesIO(csv_data), "text/csv")})

    # Evaluation 1: Micro-loan ₹1,000 for 3 months at 14% APR (EMI ₹341.14)
    res_1k = client.post("/api/loans/affordability-check", headers=headers, json={
        "loan_amount": 1000.0,
        "annual_interest_rate": 14.0,
        "tenure_months": 3,
        "processing_fee": 0.0
    })
    assert res_1k.status_code == 200
    data_1k = res_1k.json()
    assert data_1k["loan_parameters"]["loan_amount"] == 1000.0
    assert abs(data_1k["repayment_metrics"]["monthly_emi"] - 341.14) <= 0.50
    # Genuinely not affordable because pre-loan surplus is negative (-₹4,000)
    assert data_1k["verdict"] == "NOT_AFFORDABLE"
    assert any("negative pre-loan surplus" in r.lower() or "deficit" in r.lower() for r in data_1k["reasons"])

    # Evaluation 2: Larger loan ₹10,000 for 3 months at 14% APR (EMI ₹3,411.41)
    res_10k = client.post("/api/loans/affordability-check", headers=headers, json={
        "loan_amount": 10000.0,
        "annual_interest_rate": 14.0,
        "tenure_months": 3,
        "processing_fee": 0.0
    })
    assert res_10k.status_code == 200
    data_10k = res_10k.json()
    assert data_10k["loan_parameters"]["loan_amount"] == 10000.0
    assert abs(data_10k["repayment_metrics"]["monthly_emi"] - 3411.41) <= 0.50
    assert data_10k["verdict"] == "NOT_AFFORDABLE"
    # Ensure EMI updated strictly with inputs without retaining 341.14
    assert data_10k["repayment_metrics"]["monthly_emi"] > data_1k["repayment_metrics"]["monthly_emi"]

def test_positive_surplus_user_loan_amount_toggles_verdict():
    user = create_user("surplus_borrower")
    headers = user["headers"]

    # User with income ₹35,000/mo, expenses ₹20,000/mo, surplus +₹15,000/mo
    csv_data = (
        "Date,Description,Amount,Type\n"
        "2026-08-01,Gig Payout,35000.00,Credit\n"
        "2026-08-10,Living Expense,12000.00,Debit\n"
        "2026-08-15,Fuel and Bike Ops,8000.00,Debit\n"
        "2026-09-01,Gig Payout,35000.00,Credit\n"
        "2026-09-10,Living Expense,12000.00,Debit\n"
        "2026-09-15,Fuel and Bike Ops,8000.00,Debit\n"
    ).encode("utf-8")
    client.post("/api/statements/import", headers=headers, files={"file": ("stmt.csv", io.BytesIO(csv_data), "text/csv")})

    # Small loan ₹5,000 for 6 months at 12% APR -> EMI ~₹863/mo (easily fits in ₹15,000 surplus)
    res_small = client.post("/api/loans/affordability-check", headers=headers, json={
        "loan_amount": 5000.0,
        "annual_interest_rate": 12.0,
        "tenure_months": 6,
        "processing_fee": 50.0
    })
    assert res_small.status_code == 200
    data_small = res_small.json()
    assert data_small["verdict"] == "LIKELY_AFFORDABLE"

    # Excessive loan ₹3,00,000 for 12 months at 18% APR -> EMI ~₹27,504/mo (exceeds ₹15,000 surplus)
    res_large = client.post("/api/loans/affordability-check", headers=headers, json={
        "loan_amount": 300000.0,
        "annual_interest_rate": 18.0,
        "tenure_months": 12,
        "processing_fee": 1500.0
    })
    assert res_large.status_code == 200
    data_large = res_large.json()
    assert data_large["verdict"] == "NOT_AFFORDABLE"
    assert data_large["repayment_metrics"]["monthly_disposable_after_emi"] < 0
