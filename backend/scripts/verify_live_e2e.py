"""
Live End-to-End System Verification for SahayakFin
Executes live HTTP requests against http://127.0.0.1:8000
Verifies:
1. Health check
2. Demo user login & data retrieval
3. New user registration
4. Clean empty state & INSUFFICIENT_DATA status
5. Consent enforcement (revoke -> 403 upload error, grant -> success)
6. Real CSV upload & statement parsing
7. Score calculation trigger & update
8. Savings goal creation & retrieval
9. Simulated loan offer application
10. Repayments schedule retrieval
11. Multi-tenant data isolation
"""
import uuid
import requests
import io

BASE_URL = "http://127.0.0.1:8000/api"

def run_e2e_verification():
    print("=" * 70)
    print("SAHAYAKFIN LIVE END-TO-END SYSTEM VERIFICATION")
    print("=" * 70)

    # 1. Health check
    res = requests.get(f"{BASE_URL}/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("[PASS] 1. Backend Health Check: Service is UP and running")

    # 2. Demo user login
    res = requests.post(f"{BASE_URL}/auth/demo-login/USER0001")
    assert res.status_code == 200, f"Demo login failed: {res.text}"
    user1_token = res.json()["access_token"]
    user1_name = res.json()["user"]["full_name"]
    assert user1_name == "Nitin Kulkarni"
    print(f"[PASS] 2. Demo Login (USER0001): {user1_name} logged in successfully")

    # 3. Register brand new user
    rand_suffix = uuid.uuid4().hex[:6]
    new_email = f"driver_{rand_suffix}@sahayakfin-demo.in"
    reg_payload = {
        "full_name": f"Aakash Verma {rand_suffix.upper()}",
        "email": new_email,
        "phone": "+919876501234",
        "worker_type": "DELIVERY_PARTNER",
        "city": "Bengaluru",
        "password": "SecurePassword123"
    }
    res = requests.post(f"{BASE_URL}/auth/register", json=reg_payload)
    assert res.status_code == 200, f"Registration failed: {res.text}"
    new_user_token = res.json()["access_token"]
    new_user_code = res.json()["user"]["user_code"]
    headers = {"Authorization": f"Bearer {new_user_token}"}
    print(f"[PASS] 3. User Registration: Created {new_email} with code {new_user_code}")

    # 4. Empty dashboard check
    res = requests.get(f"{BASE_URL}/dashboard/summary", headers=headers)
    assert res.status_code == 200
    summary = res.json()
    assert summary["score"]["status"] == "INSUFFICIENT_DATA"
    assert summary["score"]["score"] is None
    assert len(summary["recentTransactions"]) == 0
    print("[PASS] 4. Cold Start Verified: Clean empty state & INSUFFICIENT_DATA score")

    # 5. Consent Enforcement
    # Revoke consent
    res = requests.post(f"{BASE_URL}/consent", json={"has_consented": False}, headers=headers)
    assert res.status_code == 200
    assert res.json()["is_active"] is False

    # Attempt CSV preview with revoked consent -> should return HTTP 403
    dummy_csv = "Date,Description,Amount,Type,Category,ReferenceID\n2026-08-01,Zomato Payout,4500.00,CREDIT,GIG_INCOME,REF1001\n"
    files = {"file": ("statement.csv", io.BytesIO(dummy_csv.encode("utf-8")), "text/csv")}
    res = requests.post(f"{BASE_URL}/statements/preview", files=files, headers=headers)
    assert res.status_code == 403, f"Expected 403 when consent is revoked, got {res.status_code}"
    print("[PASS] 5a. Consent Enforcement: CSV upload blocked with HTTP 403 when consent revoked")

    # Re-grant consent
    res = requests.post(f"{BASE_URL}/consent", json={"has_consented": True}, headers=headers)
    assert res.status_code == 200
    assert res.json()["is_active"] is True
    print("[PASS] 5b. Consent Enforcement: User consent successfully re-granted")

    # 6. Upload Multi-Month CSV Statement
    # Build a 3-month synthetic statement with regular gig payouts and operational debits
    csv_rows = ["Date,Description,Amount,Type,Category,ReferenceID"]
    # Month 1: Aug 2026
    csv_rows.append("2026-08-05,Zomato Weekly Payout,6800.00,CREDIT,GIG_INCOME,E2E-A1")
    csv_rows.append("2026-08-12,Zomato Weekly Payout,7200.00,CREDIT,GIG_INCOME,E2E-A2")
    csv_rows.append("2026-08-19,Swiggy Delivery Earnings,5400.00,CREDIT,GIG_INCOME,E2E-A3")
    csv_rows.append("2026-08-26,Zomato Weekly Payout,6900.00,CREDIT,GIG_INCOME,E2E-A4")
    csv_rows.append("2026-08-10,Petrol HPCL,1200.00,DEBIT,FUEL_TRANSPORT,E2E-A5")
    csv_rows.append("2026-08-20,Groceries D-Mart,2100.00,DEBIT,FOOD_GROCERIES,E2E-A6")
    # Month 2: Sep 2026
    csv_rows.append("2026-09-05,Zomato Weekly Payout,7100.00,CREDIT,GIG_INCOME,E2E-S1")
    csv_rows.append("2026-09-12,Zomato Weekly Payout,7300.00,CREDIT,GIG_INCOME,E2E-S2")
    csv_rows.append("2026-09-19,Swiggy Delivery Earnings,6100.00,CREDIT,GIG_INCOME,E2E-S3")
    csv_rows.append("2026-09-26,Zomato Weekly Payout,7400.00,CREDIT,GIG_INCOME,E2E-S4")
    csv_rows.append("2026-09-11,Petrol Indian Oil,1400.00,DEBIT,FUEL_TRANSPORT,E2E-S5")
    csv_rows.append("2026-09-22,Mobile Recharge Airtel,499.00,DEBIT,UTILITIES,E2E-S6")
    # Month 3: Oct 2026
    csv_rows.append("2026-10-05,Zomato Weekly Payout,7500.00,CREDIT,GIG_INCOME,E2E-O1")
    csv_rows.append("2026-10-12,Zomato Weekly Payout,7800.00,CREDIT,GIG_INCOME,E2E-O2")
    csv_rows.append("2026-10-19,Swiggy Delivery Earnings,6500.00,CREDIT,GIG_INCOME,E2E-O3")
    csv_rows.append("2026-10-26,Zomato Weekly Payout,7900.00,CREDIT,GIG_INCOME,E2E-O4")
    csv_rows.append("2026-10-09,Petrol BPCL,1350.00,DEBIT,FUEL_TRANSPORT,E2E-O5")
    csv_rows.append("2026-10-18,Vehicle Maintenance Service,1850.00,DEBIT,OPERATIONAL_EXPENSE,E2E-O6")

    full_csv = "\n".join(csv_rows)
    files = {"file": ("bank_statement_3m.csv", io.BytesIO(full_csv.encode("utf-8")), "text/csv")}
    prev_res = requests.post(f"{BASE_URL}/statements/preview", files=files, headers=headers)
    assert prev_res.status_code == 200, f"Preview failed: {prev_res.text}"
    preview_data = prev_res.json()
    assert preview_data["valid_rows"] == 18
    assert preview_data["warning_count"] == 0
    print(f"[PASS] 6a. Statement Preview: Parsed {preview_data['valid_rows']} valid rows with 0 warnings")

    # Ingest into database
    files = {"file": ("bank_statement_3m.csv", io.BytesIO(full_csv.encode("utf-8")), "text/csv")}
    import_res = requests.post(f"{BASE_URL}/statements/import", files=files, headers=headers)
    assert import_res.status_code == 200, f"Import failed: {import_res.text}"
    import_data = import_res.json()
    assert import_data["imported_rows"] == 18
    print(f"[PASS] 6b. Statement Ingestion: Ingested {import_data['imported_rows']} records into PostgreSQL")

    # Ingest again to verify deduplication
    files = {"file": ("bank_statement_3m.csv", io.BytesIO(full_csv.encode("utf-8")), "text/csv")}
    reimport_res = requests.post(f"{BASE_URL}/statements/import", files=files, headers=headers)
    assert reimport_res.status_code == 200
    assert reimport_res.json()["duplicate_rows"] == 18
    assert reimport_res.json()["imported_rows"] == 0
    print("[PASS] 6c. Deduplication: Re-upload correctly detected 18 duplicates and inserted 0")

    # 7. Trust Score Re-calculation
    res = requests.get(f"{BASE_URL}/score/latest", headers=headers)
    assert res.status_code == 200
    score_data = res.json()
    print("DEBUG score_data:", score_data)
    assert score_data["score"] is not None
    assert score_data["score"] >= 70
    assert score_data["status"] in ["SUFFICIENT", "PROVISIONAL_2_MONTHS", "PROVISIONAL_NO_BILL_DATA"]
    assert score_data["months_of_data"] >= 2
    print(f"[PASS] 7. Financial Trust Score: Score updated to {score_data['score']}/100 (Status: {score_data['status']})")


    # 8. Savings Goals
    goal_payload = {
        "goal_name": "Emergency Vehicle Repair Fund",
        "target_amount": 12000.0,
        "current_amount": 3500.0,
        "target_date": "2026-12-15"
    }
    res = requests.post(f"{BASE_URL}/savings-goals", json=goal_payload, headers=headers)
    assert res.status_code == 200
    goal = res.json()
    assert goal["goal_name"] == "Emergency Vehicle Repair Fund"
    assert goal["suggested_daily_saving"] > 0
    print(f"[PASS] 8. Savings Goals: Created '{goal['goal_name']}' with suggested daily saving INR {goal['suggested_daily_saving']}")

    # 9. Loan Offers & Application
    res = requests.get(f"{BASE_URL}/offers", headers=headers)
    assert res.status_code == 200
    offers = res.json()
    assert len(offers) == 7
    eligible_offers = [o for o in offers if o["is_eligible"]]
    assert len(eligible_offers) > 0
    selected_offer = eligible_offers[0]

    app_res = requests.post(
        f"{BASE_URL}/offers/apply",
        json={"offer_id": selected_offer["id"], "requested_amount": selected_offer["min_amount"]},
        headers=headers
    )
    assert app_res.status_code == 200
    app_data = app_res.json()
    assert app_data["status"] == "APPROVED_SIMULATED"
    print(f"[PASS] 9. Loan Offers: Applied for '{selected_offer['name']}' (Instant Simulated Approval)")

    # 10. Repayments Schedule
    res = requests.get(f"{BASE_URL}/repayments", headers=headers)
    assert res.status_code == 200
    reps = res.json()
    assert len(reps) > 0
    print(f"[PASS] 10. Repayments Schedule: Retrieved {len(reps)} active/simulated repayment installments")

    # 11. Multi-tenant Data Isolation
    user1_headers = {"Authorization": f"Bearer {user1_token}"}
    user1_txns = requests.get(f"{BASE_URL}/transactions", headers=user1_headers).json()
    new_user_txns = requests.get(f"{BASE_URL}/transactions", headers=headers).json()

    user1_txn_ids = {t["id"] for t in user1_txns}
    new_user_txn_ids = {t["id"] for t in new_user_txns}
    assert len(user1_txn_ids.intersection(new_user_txn_ids)) == 0
    print(f"[PASS] 11. Tenant Isolation: 0 transaction overlap between USER0001 ({len(user1_txns)} txns) and {new_user_code} ({len(new_user_txns)} txns)")

    print("=" * 70)
    print("ALL 11 END-TO-END VERIFICATION CHECKS PASSED PERFECTLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_e2e_verification()
