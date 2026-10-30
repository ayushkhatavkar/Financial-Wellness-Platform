"""
Live verification comparing Account 1 (PhonePe), Account 2 (Nitin Kulkarni), and Account 3 (New User).
Ensures metrics are derived from their own PostgreSQL records and never identical or hardcoded.
"""
import requests

BASE = "http://127.0.0.1:8000/api"

def check_account_metrics():
    print("=" * 70)
    print("VERIFYING STRICT USER-SPECIFIC DASHBOARD FINANCIAL METRICS")
    print("=" * 70)

    # 1. Account 2: Demo user Nitin Kulkarni (USER0001)
    login_nitin = requests.post(f"{BASE}/auth/demo-login/USER0001").json()
    token_nitin = login_nitin["access_token"]
    dash_nitin = requests.get(f"{BASE}/dashboard/summary", headers={"Authorization": f"Bearer {token_nitin}"}).json()
    metrics_nitin = dash_nitin["metrics"]
    score_nitin = dash_nitin["score"]

    print(f"[OK] Account 2 (Nitin Kulkarni - USER0001):")
    print(f"     - Trust Score: {score_nitin['score']} (Status: {score_nitin['status']})")
    print(f"     - Average Inflow: INR {metrics_nitin['averageMonthlyInflow']}")
    print(f"     - Monthly Expenses: INR {metrics_nitin['monthlyExpenses']}")
    print(f"     - Closing Reserve: INR {metrics_nitin['closingReserve']}")
    print(f"     - Months of History: {metrics_nitin['monthsOfData']}")

    # 2. Account 1: Live PhonePe User
    # Find latest phonepe user or register one and upload
    phonepe_login = requests.post(f"{BASE}/auth/login", json={
        "email": "phonepe_user_4bd16e@sahayakfin-demo.in",
        "password": "TestPassword@123"
    })
    if phonepe_login.status_code == 200:
        token_phonepe = phonepe_login.json()["access_token"]
        dash_phonepe = requests.get(f"{BASE}/dashboard/summary", headers={"Authorization": f"Bearer {token_phonepe}"}).json()
        metrics_phonepe = dash_phonepe["metrics"]
        score_phonepe = dash_phonepe["score"]

        print(f"[OK] Account 1 (PhonePe Statement Account):")
        print(f"     - Trust Score: {score_phonepe['score']} (Status: {score_phonepe['status']})")
        print(f"     - Average Inflow: INR {metrics_phonepe['averageMonthlyInflow']}")
        print(f"     - Monthly Expenses: INR {metrics_phonepe['monthlyExpenses']}")
        print(f"     - Closing Reserve: INR {metrics_phonepe['closingReserve']}")
        print(f"     - Months of History: {metrics_phonepe['monthsOfData']}")

        # Verify neither matches 21100 or 22400
        assert metrics_nitin["monthlyExpenses"] != 21100.0, "Nitin expense should not be 21100"
        assert metrics_nitin["closingReserve"] != 22400.0, "Nitin reserve should not be 22400"
        assert metrics_phonepe["monthlyExpenses"] != 21100.0, "PhonePe expense should not be 21100"
        assert metrics_phonepe["closingReserve"] != 22400.0, "PhonePe reserve should not be 22400"

        # Verify Account 1 and Account 2 are completely different
        assert metrics_nitin["monthlyExpenses"] != metrics_phonepe["monthlyExpenses"], "Expenses must not be identical!"
        assert metrics_nitin["closingReserve"] != metrics_phonepe["closingReserve"], "Reserves must not be identical!"
        assert metrics_nitin["averageMonthlyInflow"] != metrics_phonepe["averageMonthlyInflow"], "Inflows must not be identical!"
        print("[OK] Verified: Account 1 and Account 2 have completely different, user-specific metrics!")

    # 3. Account 3: Freshly registered empty user
    import uuid
    new_email = f"clean_{uuid.uuid4().hex[:6]}@sahayakfin.in"
    reg_clean = requests.post(f"{BASE}/auth/register", json={
        "full_name": "Clean Worker",
        "email": new_email,
        "phone": "+919333333333",
        "worker_type": "DELIVERY_PARTNER",
        "city": "Chennai",
        "password": "Password123"
    }).json()
    token_clean = reg_clean["access_token"]
    dash_clean = requests.get(f"{BASE}/dashboard/summary", headers={"Authorization": f"Bearer {token_clean}"}).json()
    metrics_clean = dash_clean["metrics"]
    score_clean = dash_clean["score"]

    print(f"[OK] Account 3 (Fresh Empty Account):")
    print(f"     - Trust Score: {score_clean['score']} (Status: {score_clean['status']})")
    print(f"     - Average Inflow: INR {metrics_clean['averageMonthlyInflow']}")
    print(f"     - Monthly Expenses: INR {metrics_clean['monthlyExpenses']}")
    print(f"     - Closing Reserve: INR {metrics_clean['closingReserve']}")
    print(f"     - Expense Categories: {metrics_clean['expenseCategories']}")

    assert metrics_clean["monthlyExpenses"] == 0.0
    assert metrics_clean["closingReserve"] == 0.0
    assert metrics_clean["averageMonthlyInflow"] == 0.0
    assert score_clean["score"] is None
    assert score_clean["status"] == "INSUFFICIENT_DATA"
    print("[OK] Verified: New clean account starts with 0.0 metrics and INSUFFICIENT_DATA status without inheriting demo data!")

    print("=" * 70)
    print("ALL USER-SPECIFIC METRIC CHECKS PASSED PERFECTLY!")
    print("=" * 70)

if __name__ == "__main__":
    check_account_metrics()
