import uuid
from datetime import date, timedelta
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def create_authenticated_user(prefix: str):
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

def test_savings_goal_contributions_and_exact_initial_count():
    user = create_authenticated_user("saver")
    headers = user["headers"]

    # 1. Create a savings goal with initial deposit of 500
    target_dt = (date.today() + timedelta(days=60)).strftime("%Y-%m-%d")
    create_res = client.post("/api/savings-goals", headers=headers, json={
        "goal_name": "Emergency Tool Kit",
        "target_amount": 2000.0,
        "current_amount": 500.0,
        "target_date": target_dt
    })
    assert create_res.status_code == 200
    goal = create_res.json()
    goal_id = goal["id"]
    assert goal["current_amount"] == 500.0
    assert goal["target_amount"] == 2000.0
    assert goal["remaining_amount"] == 1500.0
    assert goal["progress_percentage"] == 25.0
    assert goal["status"] == "IN_PROGRESS"
    # Initial deposit is counted exactly once
    assert len(goal["contributions"]) == 1
    assert goal["contributions"][0]["amount"] == 500.0
    assert goal["contributions"][0]["note"] == "Initial Goal Funding"

    # 2. Add second savings contribution: 1000 with note
    contrib_res = client.post(f"/api/savings-goals/{goal_id}/contributions", headers=headers, json={
        "amount": 1000.0,
        "contribution_date": date.today().strftime("%Y-%m-%d"),
        "note": "Weekend Incentive Bonus"
    })
    assert contrib_res.status_code == 200
    updated_goal = contrib_res.json()
    assert updated_goal["current_amount"] == 1500.0
    assert updated_goal["remaining_amount"] == 500.0
    assert updated_goal["progress_percentage"] == 75.0
    assert updated_goal["status"] == "IN_PROGRESS"
    assert len(updated_goal["contributions"]) == 2

    # 3. Add final contribution to reach/exceed target: 600
    final_res = client.post(f"/api/savings-goals/{goal_id}/contributions", headers=headers, json={
        "amount": 600.0,
        "contribution_date": date.today().strftime("%Y-%m-%d"),
        "note": "Final Target Completion"
    })
    assert final_res.status_code == 200
    completed_goal = final_res.json()
    assert completed_goal["current_amount"] == 2100.0
    assert completed_goal["remaining_amount"] == 0.0
    assert completed_goal["progress_percentage"] == 100.0
    assert completed_goal["status"] == "COMPLETED"

    # 4. Verify persistence on GET /api/savings-goals/{id}/contributions
    history_res = client.get(f"/api/savings-goals/{goal_id}/contributions", headers=headers)
    assert history_res.status_code == 200
    history = history_res.json()
    assert len(history) == 3
    # Check total sum in history matches exactly 500 + 1000 + 600 = 2100
    total_contrib_sum = sum(c["amount"] for c in history)
    assert total_contrib_sum == 2100.0

def test_repayments_and_bills_complete_lifecycle():
    user = create_authenticated_user("payer")
    headers = user["headers"]

    today = date.today()
    due_in_5_days = (today + timedelta(days=5)).strftime("%Y-%m-%d")
    overdue_3_days = (today - timedelta(days=3)).strftime("%Y-%m-%d")

    # 1. Create a LOAN facility
    loan_res = client.post("/api/repayments", headers=headers, json={
        "facility_type": "LOAN",
        "name": "E-Bike Working Capital Line",
        "provider": "SahayakFin Credit",
        "amount": 1500.0,
        "total_principal": 15000.0,
        "due_date": due_in_5_days,
        "is_recurring": True,
        "frequency": "MONTHLY",
        "notes": "Vehicle upgrade credit"
    })
    assert loan_res.status_code == 200
    loan = loan_res.json()
    loan_id = loan["id"]
    assert loan["facility_type"] == "LOAN"
    assert loan["principal_remaining"] == 15000.0
    assert loan["installment_amount"] == 1500.0
    assert loan["urgency"] in ["DUE_SOON", "UPCOMING"]

    # 2. Create an ordinary UTILITY BILL (separate from loan principal)
    bill_res = client.post("/api/repayments", headers=headers, json={
        "facility_type": "BILL",
        "name": "Jio Mobile 5G Unlimited Plan",
        "provider": "Reliance Jio",
        "amount": 349.0,
        "due_date": overdue_3_days,
        "is_recurring": True,
        "frequency": "MONTHLY",
        "notes": "Delivery navigation line"
    })
    assert bill_res.status_code == 200
    bill = bill_res.json()
    bill_id = bill["id"]
    assert bill["facility_type"] == "BILL"
    assert bill["principal_remaining"] == 0.0  # Ordinary bills do NOT have a loan principal!
    assert bill["urgency"] == "OVERDUE"

    # 3. Partial payment on the loan (1500)
    pay_loan_res = client.post(f"/api/repayments/{loan_id}/payments", headers=headers, json={
        "amount": 1500.0,
        "payment_date": today.strftime("%Y-%m-%d"),
        "payment_method": "UPI",
        "notes": "Installment 1 via PhonePe",
        "advance_next_due_date": True
    })
    assert pay_loan_res.status_code == 200
    loan_after_pay = pay_loan_res.json()
    assert loan_after_pay["principal_remaining"] == 13500.0
    assert loan_after_pay["status"] == "UPCOMING"
    assert len(loan_after_pay["payments"]) == 1
    assert loan_after_pay["payments"][0]["amount_paid"] == 1500.0

    # 4. Pay the overdue utility bill (349)
    pay_bill_res = client.post(f"/api/repayments/{bill_id}/payments", headers=headers, json={
        "amount": 349.0,
        "payment_date": today.strftime("%Y-%m-%d"),
        "payment_method": "UPI",
        "notes": "Recharged via UPI",
        "advance_next_due_date": True
    })
    assert pay_bill_res.status_code == 200
    bill_after_pay = pay_bill_res.json()
    # Ordinary bill principal remains 0, next due date advances, status UPCOMING
    assert bill_after_pay["principal_remaining"] == 0.0
    assert bill_after_pay["status"] == "UPCOMING"
    assert len(bill_after_pay["payments"]) == 1

    # 5. Full payoff of the loan (pay remaining 13500)
    pay_full_res = client.post(f"/api/repayments/{loan_id}/payments", headers=headers, json={
        "amount": 13500.0,
        "payment_date": today.strftime("%Y-%m-%d"),
        "payment_method": "NET_BANKING",
        "notes": "Pre-closure full payment"
    })
    assert pay_full_res.status_code == 200
    loan_settled = pay_full_res.json()
    assert loan_settled["principal_remaining"] == 0.0
    assert loan_settled["status"] == "PAID"
    assert loan_settled["urgency"] == "SETTLED"
    assert len(loan_settled["payments"]) == 2

    # 6. Edit commitment
    edit_res = client.put(f"/api/repayments/{bill_id}", headers=headers, json={
        "amount": 399.0,
        "notes": "Updated to 399 plan"
    })
    assert edit_res.status_code == 200
    assert edit_res.json()["installment_amount"] == 399.0
    assert edit_res.json()["notes"] == "Updated to 399 plan"

    # 7. Delete commitment
    del_res = client.delete(f"/api/repayments/{bill_id}", headers=headers)
    assert del_res.status_code == 200
    # Verify it is gone
    get_all = client.get("/api/repayments", headers=headers).json()
    assert all(i["id"] != bill_id for i in get_all)

def test_cross_user_isolation_for_savings_and_repayments():
    user_a = create_authenticated_user("isolation_a")
    user_b = create_authenticated_user("isolation_b")

    # User A creates a savings goal and a repayment
    goal_res = client.post("/api/savings-goals", headers=user_a["headers"], json={
        "goal_name": "User A Private Goal",
        "target_amount": 5000.0,
        "current_amount": 1000.0,
        "target_date": (date.today() + timedelta(days=30)).strftime("%Y-%m-%d")
    })
    goal_id = goal_res.json()["id"]

    rep_res = client.post("/api/repayments", headers=user_a["headers"], json={
        "facility_type": "LOAN",
        "name": "User A Private Loan",
        "provider": "Private Bank",
        "amount": 2000.0,
        "total_principal": 20000.0,
        "due_date": (date.today() + timedelta(days=15)).strftime("%Y-%m-%d")
    })
    rep_id = rep_res.json()["id"]

    # User B cannot see User A's goals or repayments
    goals_b = client.get("/api/savings-goals", headers=user_b["headers"]).json()
    reps_b = client.get("/api/repayments", headers=user_b["headers"]).json()
    assert all(g["id"] != goal_id for g in goals_b)
    assert all(r["id"] != rep_id for r in reps_b)

    # User B cannot add contribution to User A's goal
    tamper_goal = client.post(f"/api/savings-goals/{goal_id}/contributions", headers=user_b["headers"], json={
        "amount": 500.0
    })
    assert tamper_goal.status_code == 404

    # User B cannot record payment on User A's repayment
    tamper_pay = client.post(f"/api/repayments/{rep_id}/payments", headers=user_b["headers"], json={
        "amount": 1000.0
    })
    assert tamper_pay.status_code == 404

    # User B cannot delete User A's repayment
    tamper_del = client.delete(f"/api/repayments/{rep_id}", headers=user_b["headers"])
    assert tamper_del.status_code == 404
