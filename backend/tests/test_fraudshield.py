import io
import pytest
from datetime import date
from decimal import Decimal
from fastapi.testclient import TestClient
from app.main import app
from app.fraud import (
    FraudShieldEngine,
    OverallStatus,
    FraudCategory,
    FraudSeverity,
    mask_reference_id,
    mask_counterparty
)
from app.models.entities import Transaction

client = TestClient(app)

def get_auth_token(email="user0001@demo.sahayakfin.in", password="DemoPassword123"):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    return res.json()["access_token"]

def test_masking_utilities():
    assert mask_reference_id("123456789012") == "********9012"
    assert mask_reference_id("CSV-1-12345") == "Internal-Row"
    assert mask_reference_id(None) == "N/A"
    
    assert mask_counterparty("ramesh@okaxis") == "r****h@okaxis"
    assert "S***" in mask_counterparty("Swiggy Delivery") or "D******y" in mask_counterparty("Swiggy Delivery")

def test_duplicate_detection_utr_repeat_and_conflicts():
    records = [
        {"ref_id": "UPI-111122223333", "transaction_date": "2026-08-01", "amount": 5000.0, "transaction_type": "CREDIT", "description": "Gig Payout"},
        {"ref_id": "UPI-111122223333", "transaction_date": "2026-08-01", "amount": 5000.0, "transaction_type": "CREDIT", "description": "Gig Payout"},
        # Conflicting reference (same UTR, different amount)
        {"ref_id": "UPI-999988887777", "transaction_date": "2026-08-05", "amount": 1200.0, "transaction_type": "DEBIT", "description": "Fuel"},
        {"ref_id": "UPI-999988887777", "transaction_date": "2026-08-05", "amount": 2500.0, "transaction_type": "DEBIT", "description": "Repairs"},
        # Generated fallback reference (should NOT trigger UTR collision)
        {"ref_id": "CSV-1-100", "transaction_date": "2026-08-10", "amount": 300.0, "transaction_type": "DEBIT", "description": "Tea"},
        {"ref_id": "CSV-2-100", "transaction_date": "2026-08-11", "amount": 350.0, "transaction_type": "DEBIT", "description": "Snacks"}
    ]
    report = FraudShieldEngine.analyze_transactions(records)
    assert report.total_analyzed == 6
    assert report.overall_status == OverallStatus.REVIEW_RECOMMENDED.value
    assert report.category_counts["DUPLICATE"] >= 2
    
    rule_ids = [a.rule_id for a in report.alerts]
    assert "DUP_001_UTR_REPEAT" in rule_ids
    assert "DUP_002_CONFLICTING_REF" in rule_ids

def test_circular_transaction_detection():
    records = [
        {"ref_id": "REF-001", "transaction_date": "2026-08-10", "amount": 8000.0, "transaction_type": "CREDIT", "counterparty": "Karan Mehra", "description": "Received from Karan Mehra"},
        {"ref_id": "REF-002", "transaction_date": "2026-08-11", "amount": 8000.0, "transaction_type": "DEBIT", "counterparty": "Karan Mehra", "description": "Paid to Karan Mehra"},
        # Legitimate payout should not be flagged as circular
        {"ref_id": "REF-003", "transaction_date": "2026-08-15", "amount": 5000.0, "transaction_type": "CREDIT", "category": "GIG_INCOME", "counterparty": "Swiggy", "description": "Swiggy Payout"}
    ]
    report = FraudShieldEngine.analyze_transactions(records)
    assert report.category_counts["CIRCULAR_TRANSFER"] >= 1
    circ_alert = next(a for a in report.alerts if a.category == "CIRCULAR_TRANSFER")
    assert circ_alert.rule_id == "CIRC_001_RECIPROCAL_TRANSFER"
    assert circ_alert.evidence["cycle_count"] == 1

def test_abnormal_income_spike_vs_normal_variation():
    # Regular gig income baseline (median ~ 5000, MAD ~ 250) + 1 giant unexplained spike of 85,000
    records = [
        {"ref_id": "REF-A", "transaction_date": "2026-08-01", "amount": 4800.0, "transaction_type": "CREDIT", "category": "GIG_INCOME", "description": "Weekly earnings"},
        {"ref_id": "REF-B", "transaction_date": "2026-08-08", "amount": 5200.0, "transaction_type": "CREDIT", "category": "GIG_INCOME", "description": "Weekly earnings"},
        {"ref_id": "REF-C", "transaction_date": "2026-08-15", "amount": 4900.0, "transaction_type": "CREDIT", "category": "GIG_INCOME", "description": "Weekly earnings"},
        {"ref_id": "REF-D", "transaction_date": "2026-08-22", "amount": 5100.0, "transaction_type": "CREDIT", "category": "GIG_INCOME", "description": "Weekly earnings"},
        {"ref_id": "REF-E", "transaction_date": "2026-08-29", "amount": 85000.0, "transaction_type": "CREDIT", "category": "GIG_INCOME", "description": "Massive Sudden Inflow"},
    ]
    report = FraudShieldEngine.analyze_transactions(records)
    spike_alerts = [a for a in report.alerts if a.category == "INCOME_SPIKE"]
    assert len(spike_alerts) == 1
    assert spike_alerts[0].rule_id == "SPIKE_001_STATISTICAL_MAD_OUTLIER"
    assert spike_alerts[0].evidence["credit_amount"] == 85000.0
    assert spike_alerts[0].severity == "HIGH"

def test_clean_statement_results_in_clear_status():
    records = [
        {"ref_id": "REF-C1", "transaction_date": "2026-08-01", "amount": 4800.0, "transaction_type": "CREDIT", "category": "GIG_INCOME", "description": "Swiggy Payout"},
        {"ref_id": "REF-C2", "transaction_date": "2026-08-03", "amount": 450.0, "transaction_type": "DEBIT", "category": "FUEL_TRANSPORT", "description": "Petrol"},
        {"ref_id": "REF-C3", "transaction_date": "2026-08-08", "amount": 5100.0, "transaction_type": "CREDIT", "category": "GIG_INCOME", "description": "Swiggy Payout"},
        {"ref_id": "REF-C4", "transaction_date": "2026-08-10", "amount": 200.0, "transaction_type": "DEBIT", "category": "FOOD_GROCERIES", "description": "Lunch"}
    ]
    report = FraudShieldEngine.analyze_transactions(records)
    assert report.overall_status == OverallStatus.CLEAR.value
    assert report.flagged_count == 0
    assert report.anomaly_score == 0.0

def test_self_transfer_and_non_income_detection():
    records = [
        {"ref_id": "REF-S1", "transaction_date": "2026-08-01", "amount": 10000.0, "transaction_type": "CREDIT", "description": "Self transfer from ICICI"},
        {"ref_id": "REF-S2", "transaction_date": "2026-08-05", "amount": 25000.0, "transaction_type": "CREDIT", "description": "Loan disbursement from NBFC"},
        {"ref_id": "REF-S3", "transaction_date": "2026-08-09", "amount": 499.0, "transaction_type": "CREDIT", "description": "Refund for failed merchant order"}
    ]
    report = FraudShieldEngine.analyze_transactions(records)
    self_alerts = [a for a in report.alerts if a.category == "SELF_TRANSFER"]
    assert len(self_alerts) == 3
    rule_ids = [a.rule_id for a in self_alerts]
    assert "SELF_001_INTERNAL_TRANSFER" in rule_ids
    assert "SELF_002_LOAN_DISBURSEMENT" in rule_ids
    assert "SELF_003_REFUND_REVERSAL" in rule_ids

def get_isolated_test_user_token():
    import uuid
    email = f"fraud_test_{uuid.uuid4().hex[:8]}@sahayakfin.in"
    res = client.post("/api/auth/register", json={
        "full_name": "FraudShield Tester",
        "email": email,
        "phone": "+919876543210",
        "password": "Password123!",
        "worker_type": "DELIVERY_PARTNER",
        "city": "Bengaluru"
    })
    return res.json()["access_token"]

def test_api_statement_preview_and_import_with_fraudshield():
    token = get_isolated_test_user_token()
    headers = {"Authorization": f"Bearer {token}"}
    import uuid
    u_tag = uuid.uuid4().hex[:6]

    csv_data = (
        "Date,Transaction ID,Description,Amount,Type,Counterparty\n"
        f"2026-08-01,UPI-{u_tag}-1,Swiggy Weekly Payout,4900.00,CREDIT,Swiggy Delivery\n"
        f"2026-08-03,UPI-{u_tag}-2,Petrol Fuel,400.00,DEBIT,HPCL Fuel\n"
        f"2026-08-08,UPI-{u_tag}-3,Swiggy Weekly Payout,5100.00,CREDIT,Swiggy Delivery\n"
        f"2026-08-10,UPI-{u_tag}-4,Self transfer own account,5000.00,CREDIT,Own HDFC\n"
    )

    # 1. Preview statement
    res_preview = client.post(
        "/api/statements/preview",
        files={"file": ("test_statement.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")},
        headers=headers
    )
    assert res_preview.status_code == 200
    prev_json = res_preview.json()
    assert "integrity_report" in prev_json
    assert prev_json["integrity_report"]["total_analyzed"] == 4
    assert len(prev_json["parsed_records"]) == 4

    # 2. Ingest statement
    res_import = client.post(
        "/api/statements/import",
        files={"file": ("test_statement.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")},
        headers=headers
    )
    assert res_import.status_code == 200
    imp_json = res_import.json()
    assert "integrity_report" in imp_json
    assert imp_json["imported_rows"] >= 1

    # 3. Fetch latest integrity report
    res_report = client.get("/api/fraud/report/latest", headers=headers)
    assert res_report.status_code == 200
    rep_json = res_report.json()
    assert "overall_status" in rep_json
    assert "anomaly_score" in rep_json

def test_api_fraud_alert_review_lifecycle_and_user_isolation():
    # User 1 with uploaded statement having alerts
    token1 = get_isolated_test_user_token()
    headers1 = {"Authorization": f"Bearer {token1}"}
    import uuid
    u_tag = uuid.uuid4().hex[:6]

    csv_data = (
        "Date,Transaction ID,Description,Amount,Type,Counterparty\n"
        f"2026-08-01,UPI-{u_tag}-DUP,Swiggy Weekly Payout,4900.00,CREDIT,Swiggy Delivery\n"
        f"2026-08-02,UPI-{u_tag}-DUP,Swiggy Weekly Payout,4900.00,CREDIT,Swiggy Delivery\n"
        f"2026-08-05,UPI-{u_tag}-SELF,Self transfer from own account,5000.00,CREDIT,Own HDFC\n"
    )
    client.post(
        "/api/statements/import",
        files={"file": ("test_statement.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")},
        headers=headers1
    )

    # Fetch alerts for user 1
    res = client.get("/api/fraud/alerts", headers=headers1)
    assert res.status_code == 200
    alerts = res.json()
    assert len(alerts) > 0
    target_alert = alerts[0]
    alert_id = target_alert["id"]

    # User 2 login
    token2 = get_isolated_test_user_token()
    headers2 = {"Authorization": f"Bearer {token2}"}

    # User 2 attempting to review User 1's alert must be rejected (404 Not Found)
    res_unauthorized = client.patch(
        f"/api/fraud/alerts/{alert_id}/review",
        json={"review_status": "CLEARED", "review_notes": "Attempting unauthorized review"},
        headers=headers2
    )
    assert res_unauthorized.status_code == 404

    # User 1 successfully reviews their own alert
    res_review = client.patch(
        f"/api/fraud/alerts/{alert_id}/review",
        json={"review_status": "CONFIRMED_INVALID", "review_notes": "Confirmed invalid duplicate entry"},
        headers=headers1
    )
    assert res_review.status_code == 200
    assert res_review.json()["review_status"] == "CONFIRMED_INVALID"

def test_demo_sample_datasets():
    for sample in ("normal", "suspicious", "corrected"):
        res = client.get(f"/api/fraud/demo-samples/{sample}")
        assert res.status_code == 200
        data = res.json()
        assert "csv_content" in data
        assert "filename" in data
        assert len(data["csv_content"]) > 50
