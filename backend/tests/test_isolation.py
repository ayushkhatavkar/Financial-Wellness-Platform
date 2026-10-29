import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_strict_user_data_isolation():
    """
    Verify that user B cannot access user A's transactions or scores.
    User A: USER0001
    User B: USER0002
    """
    # 1. Login User A
    res_a = client.post("/api/auth/login", json={
        "email": "user0001@demo.sahayakfin.in",
        "password": "DemoPassword123"
    })
    assert res_a.status_code == 200
    token_a = res_a.json()["access_token"]

    # 2. Login User B
    res_b = client.post("/api/auth/login", json={
        "email": "user0002@demo.sahayakfin.in",
        "password": "DemoPassword123"
    })
    assert res_b.status_code == 200
    token_b = res_b.json()["access_token"]

    # 3. User A requests transactions -> gets User A's transactions
    tx_a = client.get("/api/transactions", headers={"Authorization": f"Bearer {token_a}"}).json()
    # 4. User B requests transactions -> gets User B's transactions
    tx_b = client.get("/api/transactions", headers={"Authorization": f"Bearer {token_b}"}).json()

    assert len(tx_a) > 0
    assert len(tx_b) > 0
    
    # Verify transaction IDs do not overlap
    ids_a = {t["id"] for t in tx_a}
    ids_b = {t["id"] for t in tx_b}
    assert ids_a.isdisjoint(ids_b), "User A and User B transactions must be completely isolated!"

    # 5. Verify User B cannot tamper with User A's transaction category
    target_tx_id = tx_a[0]["id"]
    tamper_res = client.patch(
        f"/api/transactions/{target_tx_id}/category",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"category": "TAMPERED_CATEGORY"}
    )
    # Must return 404 Not Found because the record does not belong to User B
    assert tamper_res.status_code == 404
    assert tamper_res.json()["detail"] == "Transaction not found."

    # 6. Verify scores are computed per user
    score_a = client.get("/api/score/latest", headers={"Authorization": f"Bearer {token_a}"}).json()
    score_b = client.get("/api/score/latest", headers={"Authorization": f"Bearer {token_b}"}).json()

    assert score_a["score"] is not None
    assert score_a["score"] >= 60.0
    assert score_b["status"] == "INSUFFICIENT_DATA"
    assert score_b["score"] is None

def test_two_accounts_dashboard_metrics_are_strictly_user_specific():
    """
    Regression test for shared metrics bug.
    Verifies that Account Alpha and Account Beta with different transactions
    have completely independent, user-derived dashboard metrics,
    never inherit demo fallbacks (21100, 22400), and never cross-pollinate.
    """
    import uuid
    import io

    # 1. Register User Alpha
    email_alpha = f"alpha_{uuid.uuid4().hex[:6]}@sahayakfin.in"
    res_a = client.post("/api/auth/register", json={
        "full_name": "Driver Alpha",
        "email": email_alpha,
        "phone": "+919111111111",
        "worker_type": "DELIVERY_PARTNER",
        "city": "Bengaluru",
        "password": "Password123"
    })
    token_a = res_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 2. Register User Beta
    email_beta = f"beta_{uuid.uuid4().hex[:6]}@sahayakfin.in"
    res_b = client.post("/api/auth/register", json={
        "full_name": "Driver Beta",
        "email": email_beta,
        "phone": "+919222222222",
        "worker_type": "CAB_DRIVER",
        "city": "Mumbai",
        "password": "Password123"
    })
    token_b = res_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 3. Verify clean empty states for both new accounts
    dash_empty_a = client.get("/api/dashboard/summary", headers=headers_a).json()
    dash_empty_b = client.get("/api/dashboard/summary", headers=headers_b).json()

    for d in (dash_empty_a, dash_empty_b):
        assert d["metrics"]["monthlyExpenses"] == 0.0
        assert d["metrics"]["closingReserve"] == 0.0
        assert d["metrics"]["averageMonthlyInflow"] == 0.0
        assert d["score"]["status"] == "INSUFFICIENT_DATA"
        assert d["score"]["score"] is None
        assert len(d["monthlySummaries"]) == 0
        # Must NEVER contain shared demo constants
        assert d["metrics"]["monthlyExpenses"] != 21100
        assert d["metrics"]["closingReserve"] != 22400

    # 4. Upload Alpha's distinct 2-month statement (Surplus account)
    # Aug: Inflow 30,000, Expense 10,000 -> Net +20,000
    # Sep: Inflow 40,000, Expense 15,000 -> Net +25,000
    csv_alpha = (
        "Date,Description,Amount,Type\n"
        "2026-08-10,Zomato Earning Payout,30000.00,Credit\n"
        "2026-08-15,Fuel Petrol HPCL,10000.00,Debit\n"
        "2026-09-10,Zomato Earning Payout,40000.00,Credit\n"
        "2026-09-15,Fuel Petrol BPCL,15000.00,Debit\n"
    ).encode("utf-8")
    client.post("/api/statements/import", headers=headers_a, files={"file": ("alpha.csv", io.BytesIO(csv_alpha), "text/csv")})

    # 5. Upload Beta's distinct 2-month statement (Deficit account)
    # Aug: Inflow 15,000, Expense 18,000 -> Net -3,000
    # Sep: Inflow 12,000, Expense 14,000 -> Net -2,000
    csv_beta = (
        "Date,Description,Amount,Type\n"
        "2026-08-12,Uber Driver Payout,15000.00,Credit\n"
        "2026-08-18,Vehicle Maintenance Service,18000.00,Debit\n"
        "2026-09-12,Uber Driver Payout,12000.00,Credit\n"
        "2026-09-18,Fuel Petrol Indian Oil,14000.00,Debit\n"
    ).encode("utf-8")
    client.post("/api/statements/import", headers=headers_b, files={"file": ("beta.csv", io.BytesIO(csv_beta), "text/csv")})

    # 6. Retrieve User Alpha dashboard
    dash_a = client.get("/api/dashboard/summary", headers=headers_a).json()
    metrics_a = dash_a["metrics"]
    assert metrics_a["averageMonthlyInflow"] == 35000.0  # (30000 + 40000) / 2
    assert metrics_a["monthlyExpenses"] == 12500.0       # (10000 + 15000) / 2
    assert metrics_a["closingReserve"] == 45000.0        # Cumulative: +20000 + 25000
    assert len(dash_a["monthlySummaries"]) == 2

    # 7. Retrieve User Beta dashboard
    dash_b = client.get("/api/dashboard/summary", headers=headers_b).json()
    metrics_b = dash_b["metrics"]
    assert metrics_b["averageMonthlyInflow"] == 13500.0  # (15000 + 12000) / 2
    assert metrics_b["monthlyExpenses"] == 16000.0       # (18000 + 14000) / 2
    assert metrics_b["closingReserve"] == -5000.0        # Cumulative: -3000 - 2000
    assert len(dash_b["monthlySummaries"]) == 2

    # 8. Assert strict divergence and non-demo values
    assert metrics_a["monthlyExpenses"] != metrics_b["monthlyExpenses"]
    assert metrics_a["closingReserve"] != metrics_b["closingReserve"]
    assert metrics_a["averageMonthlyInflow"] != metrics_b["averageMonthlyInflow"]

    assert metrics_a["monthlyExpenses"] != 21100
    assert metrics_b["monthlyExpenses"] != 21100
    assert metrics_a["closingReserve"] != 22400
    assert metrics_b["closingReserve"] != 22400

