"""
Live verification of PhonePe Statement Upload & Dashboard Integration
"""
import uuid
import requests
import os

BASE_URL = "http://127.0.0.1:8000/api"
FILE_PATH = r"C:\Users\Tanishka\Downloads\PhonePe_Transaction_Statement.csv"

def verify_phonepe_workflow():
    print("=" * 70)
    print("VERIFYING PHONEPE STATEMENT UPLOAD AND DASHBOARD INTEGRATION")
    print("=" * 70)

    assert os.path.exists(FILE_PATH), f"Target file not found at {FILE_PATH}"
    file_size_kb = os.path.getsize(FILE_PATH) / 1024
    print(f"[OK] Found PhonePe statement file: {FILE_PATH} ({file_size_kb:.1f} KB)")

    # 1. Register a fresh new user
    rand_code = uuid.uuid4().hex[:6]
    user_email = f"phonepe_user_{rand_code}@sahayakfin-demo.in"
    reg_res = requests.post(f"{BASE_URL}/auth/register", json={
        "full_name": f"PhonePe Test Partner {rand_code.upper()}",
        "email": user_email,
        "phone": "+919876543299",
        "worker_type": "DELIVERY_PARTNER",
        "city": "Bengaluru",
        "password": "TestPassword@123"
    })
    assert reg_res.status_code == 200, f"Registration failed: {reg_res.text}"
    token = reg_res.json()["access_token"]
    user_code = reg_res.json()["user"]["user_code"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"[OK] 1. Registered new user: {user_email} (Code: {user_code})")

    # 2. Check initial empty dashboard state
    dash_before = requests.get(f"{BASE_URL}/dashboard/summary", headers=headers).json()
    assert dash_before["score"]["status"] == "INSUFFICIENT_DATA"
    assert dash_before["score"]["score"] is None
    assert len(dash_before["recentTransactions"]) == 0
    print("[OK] 2. Verified initial dashboard is clean empty with INSUFFICIENT_DATA status")

    # 3. Preview PhonePe CSV
    with open(FILE_PATH, "rb") as f:
        file_bytes = f.read()

    files = {"file": ("PhonePe_Transaction_Statement.csv", file_bytes, "text/csv")}
    prev_res = requests.post(f"{BASE_URL}/statements/preview", files=files, headers=headers)
    assert prev_res.status_code == 200, f"Preview failed: {prev_res.text}"
    prev_data = prev_res.json()
    print(f"[OK] 3. PhonePe CSV Preview Success:")
    print(f"     - Detected Columns: {prev_data['detected_columns']}")
    print(f"     - Valid Transaction Rows: {prev_data['valid_rows']}")
    print(f"     - Warning Count: {prev_data['warning_count']}")
    assert prev_data["valid_rows"] > 100, f"Expected > 100 rows, got {prev_data['valid_rows']}"

    # 4. Import PhonePe CSV into PostgreSQL
    files = {"file": ("PhonePe_Transaction_Statement.csv", file_bytes, "text/csv")}
    imp_res = requests.post(f"{BASE_URL}/statements/import", files=files, headers=headers)
    assert imp_res.status_code == 200, f"Import failed: {imp_res.text}"
    imp_data = imp_res.json()
    print(f"[OK] 4. Ingested into PostgreSQL:")
    print(f"     - Total Processed: {imp_data['total_rows']}")
    print(f"     - Successfully Ingested: {imp_data['imported_rows']}")
    print(f"     - Duplicates Skipped: {imp_data['duplicate_rows']}")
    assert imp_data["imported_rows"] == prev_data["valid_rows"]

    # 5. Deduplication check: Upload again
    files = {"file": ("PhonePe_Transaction_Statement.csv", file_bytes, "text/csv")}
    reimp_res = requests.post(f"{BASE_URL}/statements/import", files=files, headers=headers)
    assert reimp_res.status_code == 200
    reimp_data = reimp_res.json()
    print(f"[OK] 5. Idempotent Deduplication Check:")
    print(f"     - Imported on Re-upload: {reimp_data['imported_rows']} (Expected 0)")
    print(f"     - Duplicates Bypassed: {reimp_data['duplicate_rows']} (Expected {imp_data['imported_rows']})")
    assert reimp_data["imported_rows"] == 0
    assert reimp_data["duplicate_rows"] == imp_data["imported_rows"]

    # 6. Verify Dashboard Refresh & Recalculated Score
    dash_after = requests.get(f"{BASE_URL}/dashboard/summary", headers=headers).json()
    assert len(dash_after["recentTransactions"]) > 0
    score_obj = dash_after["score"]
    print(f"[OK] 6. Dashboard Automatically Refreshed:")
    print(f"     - Recent Transactions Shown: {len(dash_after['recentTransactions'])}")
    print(f"     - Recalculated Trust Score: {score_obj['score']} / 100")
    print(f"     - Scoring Status: {score_obj['status']}")
    print(f"     - Months of History Detected: {score_obj['months_of_data']}")
    print(f"     - Average Monthly Inflow: INR {score_obj['average_monthly_income']}")
    assert score_obj["score"] is not None
    assert score_obj["months_of_data"] == 2

    # 7. Multi-Tenant Account Isolation Check
    demo_login = requests.post(f"{BASE_URL}/auth/demo-login/USER0001").json()
    demo_headers = {"Authorization": f"Bearer {demo_login['access_token']}"}
    demo_txns = requests.get(f"{BASE_URL}/transactions", headers=demo_headers).json()
    user_txns = requests.get(f"{BASE_URL}/transactions", headers=headers).json()

    demo_ids = {t["id"] for t in demo_txns}
    user_ids = {t["id"] for t in user_txns}
    overlap = demo_ids.intersection(user_ids)
    assert len(overlap) == 0, f"Isolation failure! Overlap found: {overlap}"
    print(f"[OK] 7. Strict Multi-Tenant Isolation Verified:")
    print(f"     - USER0001 Transactions: {len(demo_txns)}")
    print(f"     - New User Transactions: {len(user_txns)}")
    print(f"     - Cross-Account Overlap: 0 records")

    print("=" * 70)
    print("PHONEPE STATEMENT UPLOAD AND DASHBOARD INTEGRATION FULLY VERIFIED!")
    print("=" * 70)

if __name__ == "__main__":
    verify_phonepe_workflow()
