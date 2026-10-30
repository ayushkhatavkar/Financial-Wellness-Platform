import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "SahayakFin API"

def test_login_demo_user():
    # Login as demo user Nitin Kulkarni (USER0001 from actual Excel benchmark)
    response = client.post(
        "/api/auth/login",
        json={"email": "user0001@demo.sahayakfin.in", "password": "DemoPassword123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["user_code"] == "USER0001"
    assert data["user"]["full_name"] == "Nitin Kulkarni"

def test_get_current_user_profile():
    # Obtain token
    login_res = client.post(
        "/api/auth/login",
        json={"email": "user0001@demo.sahayakfin.in", "password": "DemoPassword123"}
    )
    token = login_res.json()["access_token"]

    # Request profile
    res = client.get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    profile = res.json()
    assert profile["user_code"] == "USER0001"
    assert profile["has_consented"] is True

def test_unauthorized_access_rejected():
    res = client.get("/api/users/me")
    assert res.status_code == 401

def test_transactions_retrieval():
    login_res = client.post(
        "/api/auth/login",
        json={"email": "user0001@demo.sahayakfin.in", "password": "DemoPassword123"}
    )
    token = login_res.json()["access_token"]

    res = client.get(
        "/api/transactions",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    txns = res.json()
    assert len(txns) > 0
    assert "amount" in txns[0]
    assert "transaction_type" in txns[0]

def test_deterministic_score_endpoint():
    login_res = client.post(
        "/api/auth/login",
        json={"email": "user0001@demo.sahayakfin.in", "password": "DemoPassword123"}
    )
    token = login_res.json()["access_token"]

    res = client.get(
        "/api/score/latest",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    score_data = res.json()
    assert score_data["score"] is not None
    assert score_data["status"] in ["SUFFICIENT", "PROVISIONAL_2_MONTHS"]
    assert "incomeStability" in score_data["components"]

def test_loan_offers_endpoint():
    login_res = client.post(
        "/api/auth/login",
        json={"email": "user0001@demo.sahayakfin.in", "password": "DemoPassword123"}
    )
    token = login_res.json()["access_token"]

    res = client.get(
        "/api/offers",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    offers = res.json()
    assert len(offers) == 7
    assert any(o["simulated"] is True for o in offers)

def test_demo_users_and_demo_login():
    res = client.get("/api/auth/demo-users")
    assert res.status_code == 200
    demo_users = res.json()
    assert len(demo_users) >= 3
    user_codes = [u["user_code"] for u in demo_users]
    assert "USER0001" in user_codes
    assert "USER0002" in user_codes
    assert "USER0003" in user_codes

    # Test direct demo-login
    demo_res = client.post("/api/auth/demo-login/USER0002")
    assert demo_res.status_code == 200
    data = demo_res.json()
    assert data["user"]["user_code"] == "USER0002"
    assert "access_token" in data

def test_user_registration():
    import uuid
    rand_email = f"newuser_{uuid.uuid4().hex[:8]}@example.com"
    reg_payload = {
        "full_name": "Test Driver",
        "email": rand_email,
        "phone": "+919876543210",
        "worker_type": "DELIVERY_PARTNER",
        "city": "Mumbai",
        "password": "Password@123"
    }
    res = client.post("/api/auth/register", json=reg_payload)
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == rand_email

def test_savings_goals_lifecycle():
    login_res = client.post(
        "/api/auth/login",
        json={"email": "user0001@demo.sahayakfin.in", "password": "DemoPassword123"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch initial goals
    res = client.get("/api/savings-goals", headers=headers)
    assert res.status_code == 200
    initial_goals = res.json()

    # Create new goal
    new_goal = {
        "goal_name": "Tyre Replacement Fund",
        "target_amount": 8000.0,
        "current_amount": 2500.0,
        "target_date": "2026-12-31"
    }
    create_res = client.post("/api/savings-goals", json=new_goal, headers=headers)
    assert create_res.status_code == 200
    created = create_res.json()
    assert created["goal_name"] == "Tyre Replacement Fund"
    assert created["target_amount"] == 8000.0

    # Fetch again to verify persistence
    res2 = client.get("/api/savings-goals", headers=headers)
    assert res2.status_code == 200
    updated_goals = res2.json()
    assert len(updated_goals) == len(initial_goals) + 1

def test_apply_for_loan_offer():
    login_res = client.post(
        "/api/auth/login",
        json={"email": "user0001@demo.sahayakfin.in", "password": "DemoPassword123"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get offers
    offers_res = client.get("/api/offers", headers=headers)
    offer_id = offers_res.json()[0]["id"]

    # Apply
    apply_res = client.post(
        "/api/offers/apply",
        json={"offer_id": offer_id, "requested_amount": 15000.0},
        headers=headers
    )
    assert apply_res.status_code == 200
    app_data = apply_res.json()
    assert app_data["status"] == "APPROVED_SIMULATED"
    assert app_data["sanction_amount"] == 15000.0

def test_repayments_schedule():
    login_res = client.post(
        "/api/auth/login",
        json={"email": "user0001@demo.sahayakfin.in", "password": "DemoPassword123"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/repayments", headers=headers)
    assert res.status_code == 200
    rep_data = res.json()
    assert isinstance(rep_data, list)
    assert len(rep_data) > 0
    assert "installment_amount" in rep_data[0]

def test_dashboard_summary_and_category_update():
    login_res = client.post(
        "/api/auth/login",
        json={"email": "user0001@demo.sahayakfin.in", "password": "DemoPassword123"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Summary
    sum_res = client.get("/api/dashboard/summary", headers=headers)
    assert sum_res.status_code == 200
    summary = sum_res.json()
    assert "user" in summary
    assert "score" in summary
    assert "monthlySummaries" in summary
    assert "recentTransactions" in summary

    # Category update
    txns_res = client.get("/api/transactions", headers=headers)
    first_txn = txns_res.json()[0]
    txn_id = first_txn["id"]

    patch_res = client.patch(
        f"/api/transactions/{txn_id}/category",
        json={"category": "HEALTHCARE"},
        headers=headers
    )
    assert patch_res.status_code == 200
    updated_txn = patch_res.json()
    assert updated_txn["new_category"] == "HEALTHCARE"



