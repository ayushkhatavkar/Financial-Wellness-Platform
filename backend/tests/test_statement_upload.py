import pytest
import io
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.fixture
def auth_headers():
    res = client.post("/api/auth/login", json={
        "email": "user0001@demo.sahayakfin.in",
        "password": "DemoPassword123"
    })
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_preview_valid_csv(auth_headers):
    csv_content = (
        "Date,Description,Amount,Type,Counterparty\n"
        "2026-10-01,Swiggy Delivery Payout,8500.00,Credit,Swiggy\n"
        "2026-10-02,HPCL Fuel Refill,450.00,Debit,HPCL\n"
    ).encode("utf-8")

    files = {"file": ("statement.csv", io.BytesIO(csv_content), "text/csv")}
    res = client.post("/api/statements/preview", headers=auth_headers, files=files)
    assert res.status_code == 200
    data = res.json()
    assert data["valid_rows"] == 2
    assert "Date" in data["detected_columns"]
    assert "Amount" in data["detected_columns"]

def test_preview_missing_required_columns(auth_headers):
    # Missing Amount
    bad_csv = (
        "Date,Description,Counterparty\n"
        "2026-10-01,Swiggy Payout,Swiggy\n"
    ).encode("utf-8")
    files = {"file": ("bad.csv", io.BytesIO(bad_csv), "text/csv")}
    res = client.post("/api/statements/preview", headers=auth_headers, files=files)
    assert res.status_code == 400
    assert "Missing essential columns" in res.json()["detail"]

def test_preview_empty_file(auth_headers):
    files = {"file": ("empty.csv", io.BytesIO(b""), "text/csv")}
    res = client.post("/api/statements/preview", headers=auth_headers, files=files)
    assert res.status_code == 400

def test_preview_invalid_dates_and_negative_amounts(auth_headers):
    csv_content = (
        "Date,Amount,Type\n"
        "invalid-date,1000,Credit\n"
        "2026-10-01,0.00,Debit\n"
        "2026-10-05,500.00,Credit\n"
    ).encode("utf-8")
    files = {"file": ("mixed.csv", io.BytesIO(csv_content), "text/csv")}
    res = client.post("/api/statements/preview", headers=auth_headers, files=files)
    assert res.status_code == 200
    data = res.json()
    # Only 1 row is valid (500.00 on 2026-10-05)
    assert data["valid_rows"] == 1
    assert data["warning_count"] == 2

def test_import_and_deduplication(auth_headers):
    csv_content = (
        "Date,Description,Amount,Type,Counterparty\n"
        "2026-09-10,Unique Delivery Shift E2E,1999.00,Credit,Zomato\n"
        "2026-09-11,Petrol Station Pump B,499.00,Debit,HPCL\n"
    ).encode("utf-8")

    files = {"file": ("import_test.csv", io.BytesIO(csv_content), "text/csv")}
    res = client.post("/api/statements/import", headers=auth_headers, files=files)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert data["imported_rows"] >= 0

    # Rerun the exact same upload -> all duplicate rows should be safely bypassed
    files2 = {"file": ("import_test.csv", io.BytesIO(csv_content), "text/csv")}
    res2 = client.post("/api/statements/import", headers=auth_headers, files=files2)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["imported_rows"] == 0
    assert data2["duplicate_rows"] == 2

def test_upload_blocked_when_consent_revoked(auth_headers):
    # 1. Revoke consent
    client.post("/api/consent", headers=auth_headers, json={"has_consented": False})

    # 2. Try upload -> must be HTTP 403 Forbidden
    csv_content = "Date,Amount\n2026-10-01,500\n".encode("utf-8")
    files = {"file": ("test.csv", io.BytesIO(csv_content), "text/csv")}
    res = client.post("/api/statements/preview", headers=auth_headers, files=files)
    assert res.status_code == 403
    assert "requires active user consent" in res.json()["detail"]

    # 3. Restore consent
    client.post("/api/consent", headers=auth_headers, json={"has_consented": True})

def test_preview_and_import_phonepe_format(auth_headers):
    # Authentic PhonePe structure with preamble, metadata, external IDs, and disclaimer footer
    phonepe_csv = (
        "Transaction Statement for +919988776655\n"
        "Duration,01 Sep 2026 - 31 Oct 2026\n"
        "\n"
        "Date,Time,Transaction Details,Transaction ID,UTR,Transaction Type,Credit/debit instrument,Amount\n"
        "2026-09-15,\t11:30,Paid to HPCL Petrol Pump,T2609151130001,889977112233,Debit,XXXXXXXX1234,450.00\n"
        "2026-09-20,\t14:22,Received from Zomato Weekly Payout,T2609201422002,112233445566,Credit,XXXXXXXX1234,7200.00\n"
        "2026-10-05,\t18:05,Paid to Mobile Recharge Airtel,T2610051805003,334455667788,Debit,XXXXXXXX1234,299.00\n"
        "2026-10-12,\t20:10,Received from Swiggy Earnings,T2610122010004,556677889900,Credit,XXXXXXXX1234,6800.00\n"
        "\n"
        "This is an automatically generated statement. Customer(s) are requested to immediately notify PhonePe in case of any errors at https://support.phonepe.com\n"
        "Visit https://www.phonepe.com/terms-conditions/ for PhonePe Terms & Conditions\n"
    ).encode("utf-8")

    files = {"file": ("PhonePe_Transaction_Statement.csv", io.BytesIO(phonepe_csv), "text/csv")}
    prev_res = client.post("/api/statements/preview", headers=auth_headers, files=files)
    assert prev_res.status_code == 200
    prev_data = prev_res.json()
    assert prev_data["valid_rows"] == 4
    assert prev_data["warning_count"] == 0
    assert "Date" in prev_data["detected_columns"]
    assert "Transaction Details" in prev_data["detected_columns"]
    assert "Amount" in prev_data["detected_columns"]

def test_preview_separate_debit_credit_columns(auth_headers):
    # Standard Indian bank format with separate withdrawal and deposit columns
    bank_csv = (
        "Txn Date,Particulars,Debit Amount,Credit Amount,Balance\n"
        "2026-10-01,UPI Swiggy Payout,,8500.00,12500.00\n"
        "2026-10-02,Fuel Petrol Indian Oil,500.00,,12000.00\n"
        "2026-10-03,Grocery Store,1200.00,,10800.00\n"
    ).encode("utf-8")

    files = {"file": ("bank_statement.csv", io.BytesIO(bank_csv), "text/csv")}
    res = client.post("/api/statements/preview", headers=auth_headers, files=files)
    assert res.status_code == 200
    data = res.json()
    assert data["valid_rows"] == 3
    assert "Debit Amount" in data["detected_columns"]
    assert "Credit Amount" in data["detected_columns"]

def test_loan_proceeds_and_refunds_excluded(auth_headers):
    csv_content = (
        "Date,Description,Amount,Type\n"
        "2026-10-01,Loan Disbursement MicroLine,10000.00,Credit\n"
        "2026-10-02,Refund for Cancelled Order,250.00,Credit\n"
        "2026-10-03,Zomato Delivery Earnings,6500.00,Credit\n"
    ).encode("utf-8")

    from app.imports.statement_parser import parse_csv_statement
    preview, records = parse_csv_statement(csv_content, "mixed_test.csv")
    assert len(records) == 3

    # Check loan disbursement
    loan_rec = [r for r in records if "Loan" in r["description"]][0]
    assert loan_rec["category"] == "LOAN_PROCEEDS"
    assert loan_rec["is_excluded_from_scoring"] is True

    # Check refund
    refund_rec = [r for r in records if "Refund" in r["description"]][0]
    assert refund_rec["is_refund"] is True
    assert refund_rec["is_excluded_from_scoring"] is True

    # Check gig earnings
    gig_rec = [r for r in records if "Zomato" in r["description"]][0]
    assert gig_rec["category"] == "GIG_INCOME"
    assert gig_rec["is_excluded_from_scoring"] is False

def test_new_user_phonepe_flow_and_dashboard_refresh():
    import uuid
    rand_email = f"phonepe_tester_{uuid.uuid4().hex[:6]}@sahayakfin.in"
    reg_res = client.post("/api/auth/register", json={
        "full_name": "PhonePe Test Driver",
        "email": rand_email,
        "phone": "+919870001122",
        "worker_type": "DELIVERY_PARTNER",
        "city": "Pune",
        "password": "Password123"
    })
    assert reg_res.status_code == 200
    token = reg_res.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {token}"}

    # 1. Cold start verification: empty dashboard and INSUFFICIENT_DATA
    dash_res = client.get("/api/dashboard/summary", headers=user_headers)
    assert dash_res.status_code == 200
    assert dash_res.json()["score"]["status"] == "INSUFFICIENT_DATA"
    assert len(dash_res.json()["recentTransactions"]) == 0

    # 2. Upload PhonePe Statement spanning 2 months
    phonepe_csv = (
        "Transaction Statement for +919870001122\n"
        "Duration,01 Sep 2026 - 31 Oct 2026\n"
        "\n"
        "Date,Time,Transaction Details,Transaction ID,UTR,Transaction Type,Credit/debit instrument,Amount\n"
        "2026-09-05,\t10:00,Paid to Indian Oil Fuel,T26090510001,881122334455,Debit,XXXXXXXX5544,550.00\n"
        "2026-09-12,\t12:30,Received from Zomato Weekly Payout,T26091212302,114477885522,Credit,XXXXXXXX5544,8200.00\n"
        "2026-09-25,\t16:45,Paid to Chai Point,T26092516453,332211445566,Debit,XXXXXXXX5544,120.00\n"
        "2026-10-05,\t11:15,Paid to HPCL Petrol,T26100511154,554433221100,Debit,XXXXXXXX5544,600.00\n"
        "2026-10-15,\t14:00,Received from Swiggy Earnings,T26101514005,778899665544,Credit,XXXXXXXX5544,7900.00\n"
        "2026-10-22,\t19:20,Paid to Airtel Mobile Recharge,T26102219206,998877441122,Debit,XXXXXXXX5544,399.00\n"
        "\n"
        "This is an automatically generated statement.\n"
    ).encode("utf-8")

    files = {"file": ("PhonePe_Transaction_Statement.csv", io.BytesIO(phonepe_csv), "text/csv")}
    imp_res = client.post("/api/statements/import", headers=user_headers, files=files)
    assert imp_res.status_code == 200
    imp_data = imp_res.json()
    assert imp_data["imported_rows"] == 6
    assert imp_data["duplicate_rows"] == 0

    # 3. Deduplication check: Uploading same PhonePe file again skips all 6
    files2 = {"file": ("PhonePe_Transaction_Statement.csv", io.BytesIO(phonepe_csv), "text/csv")}
    reimp_res = client.post("/api/statements/import", headers=user_headers, files=files2)
    assert reimp_res.status_code == 200
    assert reimp_res.json()["imported_rows"] == 0
    assert reimp_res.json()["duplicate_rows"] == 6

    # 4. Dashboard refresh verification: recent transactions populated and score updated
    dash_updated = client.get("/api/dashboard/summary", headers=user_headers)
    assert dash_updated.status_code == 200
    updated_summary = dash_updated.json()
    assert len(updated_summary["recentTransactions"]) > 0
    assert updated_summary["score"]["score"] is not None
    assert updated_summary["score"]["status"] in ["SUFFICIENT", "PROVISIONAL_2_MONTHS"]
    assert updated_summary["score"]["months_of_data"] == 2

