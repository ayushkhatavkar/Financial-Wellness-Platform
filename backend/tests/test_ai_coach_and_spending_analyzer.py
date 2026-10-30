import uuid
import io
from datetime import date, timedelta
import pytest
from fastapi.testclient import TestClient
from app.main import app

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

def test_spending_analysis_insufficient_data_handling():
    """Verify that users with no or minimal data receive a clear explanation without invented metrics."""
    user = create_user("newbie")
    headers = user["headers"]

    res = client.get("/api/coach/spending-analysis", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["is_sufficient"] is False
    assert "No completed transactions recorded yet" in data["sufficiency_note"]
    assert data["average_monthly_income"] == 0.0
    assert data["average_monthly_expenses"] == 0.0
    assert len(data["category_breakdown"]) == 0

def test_spending_analysis_multi_month_calculation_and_recommendations():
    """Verify accurate category totals, savings calculations, and non-judgmental recommendations."""
    user = create_user("active_earner")
    headers = user["headers"]

    # Upload multi-month statements (Aug & Sep)
    # Aug: Inflow 30,000, Fuel 3,000, Food 4,000, Mobile 400
    # Sep: Inflow 32,000, Fuel 3,500, Food 4,500, Mobile 400
    csv_data = (
        "Date,Description,Amount,Type\n"
        "2026-08-05,Zomato Earning Payout,30000.00,Credit\n"
        "2026-08-10,Fuel Petrol HPCL,3000.00,Debit\n"
        "2026-08-15,Mess and Food Dhaba,4000.00,Debit\n"
        "2026-08-20,Airtel Recharge Prepaid,400.00,Debit\n"
        "2026-09-05,Zomato Earning Payout,32000.00,Credit\n"
        "2026-09-10,Fuel Petrol BPCL,3500.00,Debit\n"
        "2026-09-15,Food Restaurant Swiggy,4500.00,Debit\n"
        "2026-09-20,Airtel Recharge Prepaid,400.00,Debit\n"
    ).encode("utf-8")
    client.post("/api/statements/import", headers=headers, files={"file": ("stmt.csv", io.BytesIO(csv_data), "text/csv")})

    res = client.get("/api/coach/spending-analysis", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["months_analyzed"] == 2
    assert data["is_sufficient"] is True
    # Inflow: (30000 + 32000) / 2 = 31000
    assert data["average_monthly_income"] == 31000.0
    # Outflow: (7400 + 8400) / 2 = 7900
    assert data["average_monthly_expenses"] == 7900.0
    assert data["net_monthly_savings"] == 23100.0

    categories = {c["category"]: c for c in data["category_breakdown"]}
    assert "FOOD_GROCERIES" in categories
    assert "FUEL_TRANSPORT" in categories

    food = categories["FOOD_GROCERIES"]
    assert food["current_monthly_spend"] == 4250.0  # (4000 + 4500)/2
    assert food["monthly_trend"] == "INCREASING"
    assert food["is_opportunity"] is True
    assert food["potential_monthly_savings"] > 0
    # Non-judgmental explanation check
    assert "useless" not in food["opportunity_explanation"].lower()
    assert "opportunity" in food["opportunity_explanation"].lower() or "tiffin" in food["opportunity_explanation"].lower()

def test_recommendation_lifecycle_and_goal_linking():
    """Verify accepting, editing, and linking a recommendation to an existing savings goal."""
    user = create_user("planner")
    headers = user["headers"]

    # 1. Create a Savings Goal
    goal_res = client.post("/api/savings-goals", headers=headers, json={
        "goal_name": "Bike Maintenance Reserve",
        "target_amount": 6000.0,
        "current_amount": 1000.0,
        "target_date": (date.today() + timedelta(days=90)).strftime("%Y-%m-%d")
    })
    goal_id = goal_res.json()["id"]

    # 2. Upload statement to generate recommendations
    csv_data = (
        "Date,Description,Amount,Type\n"
        "2026-08-01,Gig Inflow,25000.00,Credit\n"
        "2026-08-10,Food Dining Mess,4000.00,Debit\n"
        "2026-09-01,Gig Inflow,25000.00,Credit\n"
        "2026-09-10,Food Dining Mess,4200.00,Debit\n"
    ).encode("utf-8")
    client.post("/api/statements/import", headers=headers, files={"file": ("data.csv", io.BytesIO(csv_data), "text/csv")})

    # 3. Retrieve recommendations
    recs_res = client.get("/api/coach/recommendations", headers=headers)
    assert recs_res.status_code == 200
    recs = recs_res.json()
    assert len(recs) > 0

    target_rec = recs[0]
    rec_id = target_rec["id"]
    assert target_rec["status"] == "PENDING"

    # 4. Accept recommendation and link to the Savings Goal
    accept_res = client.post(f"/api/coach/recommendations/{rec_id}/action", headers=headers, json={
        "action": "ACCEPT",
        "link_goal_id": goal_id
    })
    assert accept_res.status_code == 200
    accepted = accept_res.json()
    assert accepted["status"] == "ACCEPTED"
    assert accepted["linked_goal_id"] == goal_id

    # 5. Edit custom limit
    edit_res = client.post(f"/api/coach/recommendations/{rec_id}/action", headers=headers, json={
        "action": "EDIT",
        "custom_limit": 3200.0
    })
    assert edit_res.status_code == 200
    edited = edit_res.json()
    assert edited["suggested_monthly_limit"] == 3200.0

def test_chatbot_multilingual_responses_and_deterministic_fallback():
    """Verify chatbot answers queries in English, Hindi, and Marathi with verified context."""
    user = create_user("chat_tester")
    headers = user["headers"]

    # Add transaction data
    csv_data = (
        "Date,Description,Amount,Type\n"
        "2026-08-01,Delivery Payout,20000.00,Credit\n"
        "2026-08-12,Fuel Petrol HPCL,3000.00,Debit\n"
        "2026-09-01,Delivery Payout,20000.00,Credit\n"
        "2026-09-12,Fuel Petrol BPCL,3200.00,Debit\n"
    ).encode("utf-8")
    client.post("/api/statements/import", headers=headers, files={"file": ("stmt.csv", io.BytesIO(csv_data), "text/csv")})

    # 1. Ask in English
    chat_en = client.post("/api/coach/chat", headers=headers, json={
        "message": "Where am I spending the most?",
        "language": "en"
    })
    assert chat_en.status_code == 200
    reply_en = chat_en.json()
    assert "Fuel" in reply_en["reply"]
    assert reply_en["language"] == "en"
    assert len(reply_en["suggested_followups"]) > 0

    # 2. Ask in Hindi
    chat_hi = client.post("/api/coach/chat", headers=headers, json={
        "message": "How can I save ₹3,000 next month?",
        "language": "hi"
    })
    assert chat_hi.status_code == 200
    reply_hi = chat_hi.json()
    assert ("बचत" in reply_hi["reply"] or "3,000" in reply_hi["reply"] or "3000" in reply_hi["reply"])
    assert reply_hi["language"] == "hi"

    # 3. Ask in Marathi
    chat_mr = client.post("/api/coach/chat", headers=headers, json={
        "message": "What actions could improve my financial health?",
        "language": "mr"
    })
    assert chat_mr.status_code == 200
    reply_mr = chat_mr.json()
    assert reply_mr["language"] == "mr"

    # 4. Affordability check
    afford_res = client.post("/api/coach/chat", headers=headers, json={
        "message": "Can I afford a purchase of ₹4,000?",
        "language": "en"
    })
    assert afford_res.status_code == 200
    assert "4,000" in afford_res.json()["reply"]

    # 5. History and deletion
    hist_res = client.get("/api/coach/chat/history", headers=headers)
    assert hist_res.status_code == 200
    hist = hist_res.json()
    assert len(hist) >= 4

    del_res = client.delete("/api/coach/chat/history", headers=headers)
    assert del_res.status_code == 200
    empty_hist = client.get("/api/coach/chat/history", headers=headers).json()
    assert len(empty_hist) == 0

def test_cross_user_isolation_for_ai_coach():
    """Verify that User A cannot see or tamper with User B's recommendations, spending, or chat."""
    user_a = create_user("iso_user_a")
    user_b = create_user("iso_user_b")

    # Add secret transaction for User A
    csv_a = (
        "Date,Description,Amount,Type\n"
        "2026-08-01,Private Income A,50000.00,Credit\n"
        "2026-08-10,Secret Medical Expense,12000.00,Debit\n"
        "2026-09-01,Private Income A,50000.00,Credit\n"
        "2026-09-10,Secret Medical Expense,12000.00,Debit\n"
    ).encode("utf-8")
    client.post("/api/statements/import", headers=user_a["headers"], files={"file": ("a.csv", io.BytesIO(csv_a), "text/csv")})

    # User A has recommendations
    recs_a = client.get("/api/coach/recommendations", headers=user_a["headers"]).json()
    assert len(recs_a) > 0
    rec_a_id = recs_a[0]["id"]

    # User B cannot see User A's recommendations
    recs_b = client.get("/api/coach/recommendations", headers=user_b["headers"]).json()
    assert all(r["id"] != rec_a_id for r in recs_b)

    # User B cannot tamper with User A's recommendation
    tamper_res = client.post(f"/api/coach/recommendations/{rec_a_id}/action", headers=user_b["headers"], json={
        "action": "ACCEPT"
    })
    assert tamper_res.status_code == 404

    # User A chats
    client.post("/api/coach/chat", headers=user_a["headers"], json={"message": "My confidential medical plan"})

    # User B cannot see User A's chat history
    chat_b = client.get("/api/coach/chat/history", headers=user_b["headers"]).json()
    assert all("confidential" not in m["content"].lower() for m in chat_b)

def test_financial_data_correctness_and_coach_chat_queries():
    """
    Verify:
    1. Self-transfers are not counted as expenses or earned income.
    2. Loan proceeds are excluded from earned income.
    3. Business operational expenses are preserved without arbitrary cuts.
    4. Dedicated quick prompts (Why is my money running low?, Explain financial score, Save ₹2,000).
    """
    user = create_user("strict_tester")
    headers = user["headers"]

    # Upload statements with self-transfer, loan proceeds, business repairs, and regular food/fuel
    csv_data = (
        "Date,Description,Amount,Type\n"
        "2026-08-01,Zomato Weekly Payout,25000.00,Credit\n"
        "2026-08-02,Loan disbursement from SahayakFin,10000.00,Credit\n"
        "2026-08-03,Self transfer to own account,5000.00,Debit\n"
        "2026-08-05,Bike Garage Servicing & Spares,2500.00,Debit\n"
        "2026-08-10,Food Dining Mess,4000.00,Debit\n"
        "2026-08-15,Fuel Petrol HPCL,3000.00,Debit\n"
        "2026-09-01,Zomato Weekly Payout,25000.00,Credit\n"
        "2026-09-02,Internal transfer from own account,5000.00,Credit\n"
        "2026-09-05,Bike Garage Servicing & Spares,2500.00,Debit\n"
        "2026-09-10,Food Dining Mess,4000.00,Debit\n"
        "2026-09-15,Fuel Petrol BPCL,3000.00,Debit\n"
    ).encode("utf-8")
    client.post("/api/statements/import", headers=headers, files={"file": ("stmt.csv", io.BytesIO(csv_data), "text/csv")})

    res = client.get("/api/coach/spending-analysis", headers=headers)
    assert res.status_code == 200
    data = res.json()

    # 1. Earned Income: only Zomato Payouts (25000 + 25000) / 2 = 25000
    # Loan disbursement (10000) and Internal transfer (5000) must be excluded!
    assert data["average_monthly_income"] == 25000.0

    # 2. Outflow: Bike Servicing (2500) + Food (4000) + Fuel (3000) = 9500
    # Self transfer (5000) must be excluded!
    assert data["average_monthly_expenses"] == 9500.0
    assert data["net_monthly_savings"] == 15500.0

    # 3. Business expenses must NOT have an opportunity cut
    categories = {c["category"]: c for c in data["category_breakdown"]}
    assert "BUSINESS_EXPENSE" in categories
    assert categories["BUSINESS_EXPENSE"]["is_opportunity"] is False
    assert categories["BUSINESS_EXPENSE"]["suggested_monthly_limit"] is None

    # 4. Chat Query: "Why is my money running low?"
    low_res = client.post("/api/coach/chat", headers=headers, json={
        "message": "Why is my money running low?"
    })
    assert low_res.status_code == 200
    low_reply = low_res.json()["reply"]
    assert "running low" in low_reply.lower() or "outflow" in low_reply.lower()
    assert "25,000" in low_reply or "9,500" in low_reply

    # 5. Chat Query: "Explain my financial score."
    score_res = client.post("/api/coach/chat", headers=headers, json={
        "message": "Explain my financial score."
    })
    assert score_res.status_code == 200
    score_reply = score_res.json()["reply"]
    assert "score" in score_reply.lower()

    # 6. Chat Query: "How can I save ₹2,000 next month?"
    save_res = client.post("/api/coach/chat", headers=headers, json={
        "message": "How can I save ₹2,000 next month?"
    })
    assert save_res.status_code == 200
    save_reply = save_res.json()["reply"]
    assert "2,000" in save_reply or "2000" in save_reply
