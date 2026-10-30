"""
AI Financial Coach Engine for SahayakFin.
Retrieves verified financial context for the authenticated user, connects to Gemini/OpenAI
if API keys are provided in backend environment, and includes a deterministic fallback
financial reasoning engine that provides accurate answers in English, Hindi, and Marathi.
"""
import os
import re
from typing import Dict, Any, List, Optional
from datetime import date
from sqlalchemy.orm import Session

from app.models.entities import User, Transaction, SavingsGoal, Repayment
from app.scoring.engine import calculate_financial_trust_score
from app.analytics.spending_analyzer import analyze_user_spending

SYSTEM_FINANCIAL_PROMPT = """
You are "SahayakFin AI", an empathetic, intelligent, and professional AI Financial Coach built specifically for Indian gig workers, delivery partners, and cab drivers.

CORE PRINCIPLES:
1. Ground every answer strictly in the user's verified financial facts provided in the context. Never fabricate transactions, balances, or eligibility.
2. The SahayakFin Financial Trust Score is an experimental alternative underwriting indicator based on cash-flow discipline. NEVER claim it is a statutory CIBIL, Experian, or RBI credit bureau score.
3. Keep advice practical, actionable, and encouraging. Never shame the user or call their spending "useless".
4. When suggesting savings, recommend realistic micro-adjustments (e.g. route clustering for fuel, home tiffin for meals, advance recharges).
5. If the user asks in Hindi or Marathi, or specifies the language, respond fluently in that language with INR (₹) notation.
6. Clearly state that SahayakFin provides coaching and decision support and does not execute real-money debits.
7. DEBT-TRAP PREVENTION: When asked about borrowing, loans, or EMIs, evaluate against the user's verified surplus and existing commitments. If a loan exceeds safe capacity or causes a deficit, strictly warn the user and recommend not taking the loan or saving first. NEVER override an unaffordable warning.
"""

def build_user_financial_context(db: Session, user: User) -> Dict[str, Any]:
    """Retrieve verified financial context for the authenticated user."""
    txns = db.query(Transaction).filter(
        Transaction.user_id == user.id
    ).order_by(Transaction.transaction_date.desc()).all()

    score_data = calculate_financial_trust_score(txns)
    spending_data = analyze_user_spending(db, user.id)
    
    goals = db.query(SavingsGoal).filter(SavingsGoal.user_id == user.id).all()
    repayments = db.query(Repayment).filter(Repayment.user_id == user.id).all()

    goals_summary = [
        {
            "name": g.goal_name,
            "target": float(g.target_amount),
            "current": float(g.current_amount),
            "remaining": max(0.0, float(g.target_amount) - float(g.current_amount)),
            "daily_needed": float(g.suggested_daily_saving),
            "status": g.status
        }
        for g in goals
    ]

    repayments_summary = [
        {
            "name": r.loan_name,
            "type": r.facility_type,
            "installment": float(r.installment_amount),
            "principal_remaining": float(r.principal_remaining),
            "due_date": r.due_date.strftime("%Y-%m-%d"),
            "status": r.status
        }
        for r in repayments
    ]

    return {
        "user_name": user.full_name,
        "worker_type": user.worker_type,
        "city": user.city,
        "trust_score": score_data.get("score"),
        "score_status": score_data.get("status"),
        "months_of_data": score_data.get("months_of_data", 0),
        "avg_monthly_income": spending_data.get("average_monthly_income", 0.0),
        "avg_monthly_expenses": spending_data.get("average_monthly_expenses", 0.0),
        "net_monthly_savings": spending_data.get("net_monthly_savings", 0.0),
        "category_breakdown": spending_data.get("category_breakdown", []),
        "potential_monthly_savings": spending_data.get("potential_total_monthly_savings", 0.0),
        "potential_annual_savings": spending_data.get("potential_total_annual_savings", 0.0),
        "savings_goals": goals_summary,
        "commitments": repayments_summary,
        "is_sufficient": spending_data.get("is_sufficient", False),
        "sufficiency_note": spending_data.get("sufficiency_note", "")
    }

def generate_deterministic_response(
    message: str, 
    context: Dict[str, Any], 
    language: str = "en"
) -> Dict[str, Any]:
    """
    Intelligent deterministic financial reasoning engine.
    Used when external LLM keys are not configured or when network is unavailable.
    Accurately analyzes questions about spending, savings, score, affordability, and recommendations.
    """
    msg_lower = message.lower()
    income = context["avg_monthly_income"]
    expenses = context["avg_monthly_expenses"]
    net_savings = context["net_monthly_savings"]
    score = context["trust_score"]
    categories = context["category_breakdown"]
    goals = context["savings_goals"]
    commitments = context["commitments"]

    top_cat = categories[0] if categories else None

    # Intent 1: "Where am I spending the most?" / Spending Breakdown
    if any(k in msg_lower for k in ["where am i spending", "spending the most", "top spending", "highest expense", "kaha kharch", "kuthe kharch", "spending breakdown"]):
        if not categories:
            reply_en = "You have no verified spending transactions recorded yet. Once you import a statement, I can highlight your largest outflow categories."
            reply_hi = "अभी तक आपका कोई सत्यापित लेन-देन दर्ज नहीं है। स्टेटमेंट अपलोड करने के बाद मैं आपके खर्चों का विश्लेषण करूँगा।"
            reply_mr = "अद्याप तुमचे कोणतेही सत्यापित व्यवहार नोंदवलेले नाहीत. स्टेटमेंट अपलोड केल्यानंतर मी तुमच्या खर्चाचे विश्लेषण करेन."
        else:
            cat_list_en = ", ".join([f"{c['category_label']} (₹{c['current_monthly_spend']:,.0f}/mo - {c['percentage_of_expenses']}%)" for c in categories[:3]])
            reply_en = (
                f"Based on your verified transactions, your highest monthly spending is in **{top_cat['category_label']}** at **₹{top_cat['current_monthly_spend']:,.2f}/month** ({top_cat['percentage_of_expenses']}% of total expenses).\n\n"
                f"**Top Outflow Categories:**\n"
                f"{cat_list_en}\n\n"
                f"💡 **Coach Advice:** Your average monthly income is ₹{income:,.2f}. Keeping non-essential outlays within planned limits can free up ₹{context['potential_monthly_savings']:,.2f}/month for your emergency reserves."
            )
            reply_hi = (
                f"आपके सत्यापित डेटा के अनुसार, आपका सबसे अधिक खर्च **{top_cat['category_label']}** में **₹{top_cat['current_monthly_spend']:,.2f}/महीने** ({top_cat['percentage_of_expenses']}%) हो रहा है।\n\n"
                f"आपकी औसत मासिक आय ₹{income:,.2f} है। सही योजना बनाकर आप हर महीने लगभग ₹{context['potential_monthly_savings']:,.2f} की बचत कर सकते हैं।"
            )
            reply_mr = (
                f"तुमच्या सत्यापित व्यवहारानुसार, तुमचा सर्वाधिक खर्च **{top_cat['category_label']}** मध्ये **₹{top_cat['current_monthly_spend']:,.2f}/महिना** होत आहे.\n\n"
                f"तुमचे सरासरी मासिक उत्पन्न ₹{income:,.2f} आहे. थोडे नियोजन करून तुम्ही दरमहा सुमारे ₹{context['potential_monthly_savings']:,.2f} ची बचत करू शकता."
            )

        reply = reply_hi if language == "hi" else (reply_mr if language == "mr" else reply_en)
        return {
            "reply": reply,
            "suggested_followups": [
                "How can I save ₹2,000 next month?",
                "Why is my money running low?",
                "Explain my financial score."
            ],
            "data_citations": {"top_category": top_cat["category_label"] if top_cat else "None", "amount": top_cat["current_monthly_spend"] if top_cat else 0}
        }

    # Intent 2: "How can I save ₹2,000 next month?" / Savings Goal Roadmap
    elif (not any(b in msg_lower for b in ["borrow", "loan", "karz", "should i", "falls", "drop", "emi"])) and any(k in msg_lower for k in ["how to save", "save money", "how can i save", "bachat kaise", "save ₹", "save rs", "2000", "2,000", "3000", "3,000", "save"]):
        target_match = re.search(r'(\d+[\d,]*)', msg_lower)
        target_amt = float(target_match.group(1).replace(',', '')) if target_match else 2000.0

        daily_target = round(target_amt / 30.0, 1)

        reply_en = (
            f"Here is your personalized roadmap to save **₹{target_amt:,.0f} next month** (₹{daily_target}/day):\n\n"
            f"1. **Meal Packing & Daily Refreshments (Save ~₹1,000–1,200):** Carrying home water and afternoon tiffin reduces on-shift chai and canteen debits.\n"
            f"2. **Fuel Route Optimization (Save ~₹500–600):** Consolidate peak delivery orders and limit empty cruising between pickups.\n"
            f"3. **Peer Transfer & Discretionary Cap (Save ~₹400–500):** Set an intentional weekly ceiling on unbudgeted UPI micro-transfers.\n\n"
            f"🎯 **Action:** You currently have **{len(goals)} active savings goals**. Direct this saved surplus straight into your savings goals to build an emergency fund."
        )
        reply_hi = (
            f"अगले महीने **₹{target_amt:,.0f} बचाने** का आसान प्लान (लगभग ₹{daily_target}/दिन):\n\n"
            f"1. **खाना-पीना (₹1,000-1,200 बचत):** घर से टिफिन और पानी लेकर कैंटीन व नाश्ते के खर्च कम करें।\n"
            f"2. **ईंधन व पेट्रोल (₹500-600 बचत):** डिलीवरी रूट सही करके बेवजह गाड़ी चलाने से बचें।\n"
            f"3. **UPI ट्रांसफर सीमा (₹400-500 बचत):** छोटे-मोटे अनियोजित खर्चों पर लगाम लगाएं।\n\n"
            f"इस बचत को सीधे अपने बचत लक्ष्य (Savings Goals) में जमा करें।"
        )
        reply_mr = (
            f"पुढील महिन्यात **₹{target_amt:,.0f} बचत** करण्याचा सोपा मार्ग (सुमारे ₹{daily_target}/दिवस):\n\n"
            f"1. **जेवण व चहा-पाणी:** घरून डबा नेऊन ₹1,000-1,200 वाचवा.\n"
            f"2. **इंधन नियोजन:** योग्य रूटिंगने ₹500-600 ची बचत करा.\n"
            f"3. **किरकोळ UPI खर्च:** नको असलेल्या खर्चावर नियंत्रण ठेवून ₹400-500 वाचवा.\n\n"
            f"ही बचत थेट तुमच्या सेव्हिंग्स गोलमध्ये जमा करा."
        )

        reply = reply_hi if language == "hi" else (reply_mr if language == "mr" else reply_en)
        return {
            "reply": reply,
            "suggested_followups": [
                "Where am I spending the most?",
                "Why is my money running low?",
                "Explain my financial score."
            ],
            "data_citations": {"target_savings": target_amt, "daily_required": daily_target}
        }

    # Intent 3: "Why is my money running low?" / Cash Flow Diagnosis
    elif any(k in msg_lower for k in [
        "money running low", "running low", "paisa kyu", "paise kam", 
        "why am i broke", "low balance", "no money left", "money finish", "expenses high"
    ]):
        exp_ratio = round((expenses / income * 100), 1) if income > 0 else 0.0
        top_cats_str = ", ".join([f"{c['category_label']} (₹{c['current_monthly_spend']:,.0f}/mo)" for c in categories[:2]]) if categories else "general outflows"

        reply_en = (
            f"Here is why your money is running low based on your verified statement data:\n\n"
            f"1. **High Outflow Ratio ({exp_ratio}% of earnings):** Your average monthly income is **₹{income:,.2f}**, while your monthly expenses consume **₹{expenses:,.2f}**, leaving only **₹{net_savings:,.2f}/month** in net surplus.\n"
            f"2. **Primary Cash Drains:** Your highest outflows are concentrated in **{top_cats_str}**.\n"
            f"3. **Ad-Hoc Peer Transfers:** Discretionary UPI transfers often quietly deplete your reserve before month-end.\n\n"
            f"💡 **2 Immediate Steps to Keep More Cash:**\n"
            f"• Set a monthly limit on Food & Dining to preserve an extra ₹{context['potential_monthly_savings']:,.2f}/month.\n"
            f"• Protect a 7-day reserve (₹1,500) strictly for fuel so you never run out during high-earning shifts."
        )
        reply_hi = (
            f"आपके सत्यापित डेटा के अनुसार पैसे कम पड़ने के मुख्य कारण:\n\n"
            f"1. **कमाई का {exp_ratio}% खर्च होना:** आपकी मासिक आय ₹{income:,.2f} में से ₹{expenses:,.2f} खर्च हो जाते हैं, जिससे केवल ₹{net_savings:,.2f} बचते हैं।\n"
            f"2. **सबसे बड़े खर्चे:** {top_cats_str} में सबसे ज्यादा रकम जा रही है।\n"
            f"3. **अनियोजित UPI ट्रांसफर:** छोटे-छोटे अनियोजित खर्चे महीने के अंत में बजट बिगाड़ देते हैं।\n\n"
            f"सुझाव: खाने-पीने और गैर-ज़रूरी खर्चों पर सीमा तय करके आप हर महीने लगभग ₹{context['potential_monthly_savings']:,.2f} रोक सकते हैं।"
        )
        reply_mr = (
            f"तुमच्या खात्यातील पैसे लवकर संपण्याची कारणे:\n\n"
            f"1. **उत्पन्नाच्या {exp_ratio}% खर्च:** दरमहा ₹{income:,.2f} पैकी ₹{expenses:,.2f} खर्च होतात आणि फक्त ₹{net_savings:,.2f} शिल्लक राहतात.\n"
            f"2. **प्रमुख खर्च:** {top_cats_str} मध्ये सर्वाधिक खर्च होतो.\n\n"
            f"सल्ला: अनावश्यक खर्च मर्यादित करून दरमहा ₹{context['potential_monthly_savings']:,.2f} शिल्लक ठेवा."
        )

        reply = reply_hi if language == "hi" else (reply_mr if language == "mr" else reply_en)
        return {
            "reply": reply,
            "suggested_followups": [
                "How can I save ₹2,000 next month?",
                "Where am I spending the most?",
                "Explain my financial score."
            ],
            "data_citations": {"income": income, "expenses": expenses, "outflow_ratio_pct": exp_ratio}
        }

    # Intent 4: "Why is my Financial Trust Score low?" / "Explain my financial score"
    elif any(k in msg_lower for k in [
        "trust score", "score low", "explain score", "explain my financial score", 
        "financial score", "score", "kam score", "karan", "improve score"
    ]):
        score_val = score if score is not None else "Insufficient Data"
        months = context["months_of_data"]

        reply_en = (
            f"Your current **Financial Trust Score is {score_val}** ({context['score_status']}).\n\n"
            f"**Key Factors Affecting Your Score:**\n"
            f"• **Data History ({months} Months):** Alternative underwriting requires at least 60–90 days of consistent transactions to verify income stability.\n"
            f"• **Cash Flow Buffer:** Closing reserve is currently ₹{context['net_monthly_savings']:,.2f}/month. A positive reserve of at least 15 days of expenses boosts score significantly.\n"
            f"• **Bill Payment Discipline:** Logging on-time recharges and repayments reinforces your bill payment reliability index.\n\n"
            f"ℹ️ *Note: The Financial Trust Score is an experimental mathematical indicator for alternative gig-credit and is NOT a CIBIL or RBI bureau score.*"
        )
        reply_hi = (
            f"आपका वर्तमान **फाइनेंशियल ट्रस्ट स्कोर {score_val}** है ({context['score_status']})।\n\n"
            f"**स्कोर के मुख्य कारण:**\n"
            f"• लेन-देन का इतिहास: कम से कम 60-90 दिन के लगातार रिकॉर्ड से स्थिरता सिद्ध होती है।\n"
            f"• कैश फ्लो रिज़र्व: हर महीने कमाई का कुछ हिस्सा बचाकर रखने से स्कोर तेज़ी से बढ़ता है।\n"
            f"• समय पर बिल भुगतान: मोबाइल व उपयोगिता बिलों का समय पर भुगतान स्कोर मजबूत करता है।\n\n"
            f"ध्यान दें: यह प्रायोगिक स्कोर है, आधिकारिक CIBIL स्कोर नहीं।"
        )
        reply_mr = (
            f"तुमचा सध्याचा **फायनान्शियल ट्रस्ट स्कोअर {score_val}** आहे.\n\n"
            f"**स्कोअर वाढवण्यासाठी महत्त्वाच्या गोष्टी:**\n"
            f"• किमान ६० ते ९० दिवसांचे सलग व्यवहारांचे रेकॉर्ड्स ठेवा.\n"
            f"• खर्चापेक्षा कमाई जास्त ठेवून दरमहा शिल्लक वाढवा.\n"
            f"• वेळेवर मोबाईल रिचार्ज व कर्जाचे हप्ते भरा."
        )

        reply = reply_hi if language == "hi" else (reply_mr if language == "mr" else reply_en)
        return {
            "reply": reply,
            "suggested_followups": [
                "What actions could improve my financial health?",
                "How can I save ₹2,000 next month?",
                "Can I afford a loan of ₹20,000?"
            ],
            "data_citations": {"score": score_val, "status": context["score_status"]}
        }

    # Intent 5: Income Stress Test ("What if my income falls by 25%?")
    elif any(k in msg_lower for k in ["falls by", "income falls", "drops by", "drop by", "25%", "kamai kam", "income kam"]):
        stress_income = round(income * 0.75, 2)
        stress_surplus = round(stress_income - expenses, 2)

        if stress_surplus < 0:
            status_desc = f"⚠️ **Deficit Risk:** You would face a monthly shortfall of **₹{abs(stress_surplus):,.2f}**."
        else:
            status_desc = f"✅ **Buffer Intact:** You would still maintain a positive buffer of **₹{stress_surplus:,.2f}/month**."

        reply_en = (
            f"### Stress Test Result (25% Drop in Delivery Earnings)\n\n"
            f"• **Normal Monthly Income:** ₹{income:,.2f}\n"
            f"• **Stressed Monthly Income (75%):** ₹{stress_income:,.2f}\n"
            f"• **Monthly Living & Work Expenses:** ₹{expenses:,.2f}\n"
            f"• **Remaining Monthly Buffer:** ₹{stress_surplus:,.2f}\n\n"
            f"{status_desc}\n\n"
            f"💡 **Coach Advice:** Monsoons, vehicle breakdowns, or platform changes can cause sudden income drops. "
            f"We recommend keeping a dedicated 1-month fuel buffer (₹3,000) so you never need emergency high-interest loans during lean weeks."
        )
        reply_hi = (
            f"### 25% कमाई घटने पर तनाव परीक्षण (Stress Test)\n\n"
            f"• सामान्य मासिक आय: ₹{income:,.2f}\n"
            f"• 25% कम आय: ₹{stress_income:,.2f}\n"
            f"• मासिक खर्चे: ₹{expenses:,.2f}\n"
            f"• शेष बचत: ₹{stress_surplus:,.2f}\n\n"
            f"{status_desc}\n\n"
            f"सुझाव: कम से कम ₹3,000 का इमरजेंसी रिज़र्व हमेशा अलग रखें ताकि मंदी के समय कर्ज न लेना पड़े।"
        )
        reply_mr = (
            f"### २५% उत्पन्न कमी झाल्यास ताण चाचणी\n\n"
            f"• सामान्य उत्पन्न: ₹{income:,.2f}\n"
            f"• २५% कमी उत्पन्न: ₹{stress_income:,.2f}\n"
            f"• मासिक खर्च: ₹{expenses:,.2f}\n"
            f"• शिल्लक: ₹{stress_surplus:,.2f}\n\n"
            f"{status_desc}"
        )

        reply = reply_hi if language == "hi" else (reply_mr if language == "mr" else reply_en)
        return {
            "reply": reply,
            "suggested_followups": [
                "What EMI can I safely afford?",
                "Should I borrow or save first?",
                "Can I afford a loan of ₹20,000?"
            ],
            "data_citations": {"stress_income": stress_income, "stress_surplus": stress_surplus}
        }

    # Intent 6: "Should I borrow or save first?"
    elif any(k in msg_lower for k in ["borrow or save", "save first", "save or borrow", "karz ya bachat", "karz ghyave ki bachat"]):
        reply_en = (
            f"### Should You Borrow or Save First?\n\n"
            f"💡 **Strong Recommendation: Save first whenever possible.**\n\n"
            f"1. **Avoid High Interest Trap:** Commercial or digital micro-loans often charge 18%–36% APR. Borrowing ₹20,000 for 12 months means paying ₹2,000–₹4,000 in interest alone.\n"
            f"2. **Protect Against Gig Volatility:** Taking on mandatory monthly EMIs restricts your cash flow when platform delivery demand fluctuates.\n"
            f"3. **Your Current Savings Power:** Your net surplus is ₹{net_savings:,.2f}/month. In the 'Savings Goals' section, you can accumulate this purchase debt-free in just a few months with ₹0 interest paid.\n\n"
            f"⚠️ *Only borrow if it directly expands your daily earning capacity (such as essential commercial vehicle repair that prevents you from working).* "
        )
        reply_hi = (
            f"### कर्ज लें या पहले बचत करें?\n\n"
            f"💡 **सलाह: हमेशा पहले बचत करना सबसे सुरक्षित है।**\n\n"
            f"1. **ब्याज से बचाव:** छोटे लोन पर 18%-36% तक ब्याज लगता है।\n"
            f"2. **काम में स्थिरता:** अनिवार्य EMI से खराब हफ़्तों में आर्थिक दबाव बढ़ जाता है।\n"
            f"3. **आपकी क्षमता:** आपकी मासिक बचत ₹{net_savings:,.2f} है। बचत लक्ष्य बनाकर बिना किसी ब्याज के रकम जोड़ना बेहतर है।"
        )
        reply_mr = (
            f"### कर्ज घ्यावे की आधी बचत करावी?\n\n"
            f"💡 **सल्ला: शक्य असल्यास आधी बचत करणे नेहमी सुरक्षित ठरते.**\n\n"
            f"१. कर्जावरील १८% ते ३६% व्याज वाचवा.\n"
            f"२. उत्पन्नात चढ-उतार असताना EMI चा ताण टाळा.\n"
            f"३. तुमची मासिक बचत ₹{net_savings:,.2f} सेव्हिंग्स गोलमध्ये जमा करून उद्दिष्ट पूर्ण करा."
        )

        reply = reply_hi if language == "hi" else (reply_mr if language == "mr" else reply_en)
        return {
            "reply": reply,
            "suggested_followups": [
                "What EMI can I safely afford?",
                "Can I afford a loan of ₹20,000?",
                "What if my income falls by 25%?"
            ],
            "data_citations": {"monthly_surplus": net_savings}
        }

    # Intent 7: "What EMI can I safely afford?"
    elif any(k in msg_lower for k in ["what emi", "safe emi", "emi can i afford", "kitna emi", "kiti emi"]):
        existing_debt_total = sum(float(c["installment"]) for c in commitments if c["type"] == "LOAN")
        safe_max_emi = max(0.0, round(min((income * 0.30) - existing_debt_total, max(0.0, net_savings * 0.50)), 2))

        reply_en = (
            f"### Safe EMI Capacity Assessment\n\n"
            f"Based on your verified monthly earnings of **₹{income:,.2f}** and current living expenses:\n\n"
            f"• **Maximum Safe Monthly EMI:** **₹{safe_max_emi:,.2f} / month**\n"
            f"• **Existing Active Loan Commitments:** ₹{existing_debt_total:,.2f}/month\n"
            f"• **Net Monthly Cash Surplus:** ₹{net_savings:,.2f}/month\n\n"
            f"🛡️ **Safety Rule:** Total debt servicing should never exceed 30–35% of gig earnings. "
            f"Keeping your new EMI under ₹{safe_max_emi:,.2f} ensures you can service payments even during lean delivery weeks."
        )
        reply_hi = (
            f"### सुरक्षित EMI क्षमता\n\n"
            f"आपकी औसत मासिक आय ₹{income:,.2f} के अनुसार:\n"
            f"• **सुरक्षित मासिक EMI:** अधिकतम **₹{safe_max_emi:,.2f}/महीना**\n"
            f"• वर्तमान मासिक कर्ज किस्तें: ₹{existing_debt_total:,.2f}\n"
            f"• उपलब्ध मासिक बचत: ₹{net_savings:,.2f}\n\n"
            f"EMI को ₹{safe_max_emi:,.2f} से कम रखने पर आमदनी घटने पर भी किस्तें चुकाना आसान रहेगा।"
        )
        reply_mr = (
            f"### सुरक्षित EMI मर्यादा\n\n"
            f"तुमच्या सरासरी मासिक उत्पन्न ₹{income:,.2f} नुसार:\n"
            f"• **कमाल सुरक्षित EMI:** **₹{safe_max_emi:,.2f}/महिना**\n"
            f"• सध्याचे चालू हप्ते: ₹{existing_debt_total:,.2f}\n"
            f"• उपलब्ध मासिक शिल्लक: ₹{net_savings:,.2f}"
        )

        reply = reply_hi if language == "hi" else (reply_mr if language == "mr" else reply_en)
        return {
            "reply": reply,
            "suggested_followups": [
                "Can I afford a loan of ₹20,000?",
                "What if my income falls by 25%?",
                "Should I borrow or save first?"
            ],
            "data_citations": {"safe_max_emi": safe_max_emi, "existing_debt": existing_debt_total}
        }

    # Intent 8: "Can I afford a loan of ₹X?" / "Can I borrow ₹X on my current income?"
    elif any(k in msg_lower for k in ["loan", "borrow", "karz", "afford", "can i buy", "purchase"]):
        amount_match = re.search(r'(\d+[\d,]*)', msg_lower)
        target_amt = float(amount_match.group(1).replace(',', '')) if amount_match else 20000.0

        # Estimate reducing balance EMI at 15% APR over 12 months for prompt diagnostic
        monthly_rate = (15.0 / 100.0) / 12.0
        tenure = 12
        num = monthly_rate * ((1.0 + monthly_rate) ** tenure)
        den = ((1.0 + monthly_rate) ** tenure) - 1.0
        estimated_emi = round(target_amt * (num / den), 2)
        buffer_after = round(net_savings - estimated_emi, 2)
        total_repay = round(estimated_emi * tenure, 2)

        is_loan_query = any(k in msg_lower for k in ["loan", "borrow", "karz"])

        if is_loan_query:
            if target_amt >= 100000.0 or buffer_after < 0 or estimated_emi > (income * 0.40):
                verdict_tag = "🛑 **NOT AFFORDABLE with current finances**"
                advice_en = (
                    f"A loan of ₹{target_amt:,.0f} requires an estimated EMI of **₹{estimated_emi:,.2f}/month** (Total repayment: ₹{total_repay:,.2f}).\n\n"
                    f"• **Why it's high risk:** Your average monthly income is ₹{income:,.2f} with a net surplus of ₹{net_savings:,.2f}/month. "
                    f"This EMI would consume {round((estimated_emi/income)*100, 1)}% of your earnings and create an immediate monthly deficit of ₹{abs(buffer_after):,.2f}.\n"
                    f"• **Debt-Trap Prevention Warning:** Taking this loan carries an extreme risk of default, harassment, and severe cash depletion. "
                    f"We strongly recommend **NOT taking this loan**."
                )
                advice_hi = (
                    f"₹{target_amt:,.0f} का लोन लेने पर लगभग **₹{estimated_emi:,.2f}/महीने** की EMI आएगी।\n\n"
                    f"यह आपकी मासिक बचत (₹{net_savings:,.2f}) से अधिक है और आपकी आय का {round((estimated_emi/income)*100, 1)}% खा जाएगी। "
                    f"यह लोन आपकी आर्थिक स्थिति के लिए खतरनाक साबित होगा। **हमारी सलाह है कि यह लोन न लें।**"
                )
                advice_mr = (
                    f"₹{target_amt:,.0f} च्या कर्जासाठी दरमहा सुमारे **₹{estimated_emi:,.2f} EMI** येईल. "
                    f"ही रक्कम तुमच्या शिल्लक निधीपेक्षा जास्त असल्याने हे कर्ज घेणे धोकादायक ठरेल. **सध्या हे कर्ज न घेणेच हिताचे आहे.**"
                )
            elif buffer_after < (income * 0.10):
                verdict_tag = "⚠️ **PROCEED WITH CAUTION**"
                advice_en = (
                    f"A loan of ₹{target_amt:,.0f} over 12 months requires an estimated EMI of **₹{estimated_emi:,.2f}/month**.\n\n"
                    f"• **Tightly Manageable:** Leaves a tight remaining buffer of only ₹{buffer_after:,.2f}/month from your current surplus of ₹{net_savings:,.2f}.\n"
                    f"• Under a 25% drop in delivery orders, your buffer will drop close to zero. "
                    f"Consider borrowing a smaller amount (e.g. ₹{round(target_amt/2, -3):,.0f}) or extending the tenure."
                )
                advice_hi = (
                    f"₹{target_amt:,.0f} के लोन पर लगभग ₹{estimated_emi:,.2f}/महीने की EMI आएगी। "
                    f"किस्त भरने के बाद आपके पास केवल ₹{buffer_after:,.2f}/महीने बचेंगे। किसी भी इमरजेंसी में दिक्कत हो सकती है, इसलिए सावधानी बरतें।"
                )
                advice_mr = (
                    f"₹{target_amt:,.0f} च्या कर्जासाठी सुमारे ₹{estimated_emi:,.2f} EMI येईल. "
                    f"हप्ता भरल्यानंतर केवळ ₹{buffer_after:,.2f} शिल्लक राहतील. उत्पन्नात घट झाल्यास अडचण येऊ शकते."
                )
            else:
                verdict_tag = "✅ **LIKELY AFFORDABLE**"
                advice_en = (
                    f"A loan of ₹{target_amt:,.0f} over 12 months at 15% APR yields an EMI of **₹{estimated_emi:,.2f}/month**.\n\n"
                    f"• Your monthly surplus is ₹{net_savings:,.2f}, leaving a comfortable cushion of ₹{buffer_after:,.2f}/month after paying the EMI.\n"
                    f"• You can review full stress-test diagnostics on the **Debt-Trap Prevention** page (`/loans`)."
                )
                advice_hi = (
                    f"₹{target_amt:,.0f} का 12 महीने का लोन (₹{estimated_emi:,.2f}/महीना EMI) आपकी वर्तमान ₹{net_savings:,.2f} की मासिक बचत के अनुसार संभव है। "
                    f"किस्त के बाद भी ₹{buffer_after:,.2f}/महीना बचेगा।"
                )
                advice_mr = (
                    f"₹{target_amt:,.0f} चे कर्ज (₹{estimated_emi:,.2f}/महिना EMI) तुमच्या सध्याच्या ₹{net_savings:,.2f} शिल्लक निधीनुसार परवडणारे आहे."
                )

            reply_en = f"### Loan Affordability Diagnostic: ₹{target_amt:,.0f}\n\n{verdict_tag}\n\n{advice_en}"
            reply_hi = f"### कर्ज क्षमता विश्लेषण: ₹{target_amt:,.0f}\n\n{verdict_tag}\n\n{advice_hi}"
            reply_mr = f"### कर्ज क्षमता विश्लेषण: ₹{target_amt:,.0f}\n\n{verdict_tag}\n\n{advice_mr}"
        else:
            # General purchase query
            is_affordable = (net_savings >= target_amt) or (income > 0 and target_amt <= (income * 0.25))
            if is_affordable:
                verdict_tag = f"✅ **Yes, purchase of ₹{target_amt:,.0f} is manageable**, but plan ahead."
                detail = f"Your average monthly surplus is ₹{net_savings:,.2f}. If you spread this cost across 2 months (₹{target_amt/2:,.0f}/mo), your fuel and household reserves will remain intact."
            else:
                verdict_tag = f"⚠️ **Exercise caution with a ₹{target_amt:,.0f} purchase right now.**"
                detail = f"Your current net monthly cash flow is ₹{net_savings:,.2f} with average income of ₹{income:,.2f}. An immediate lump-sum expense of ₹{target_amt:,.0f} may deplete your fuel reserve or force borrowing."

            reply_en = f"{verdict_tag}\n\n{detail}"
            reply_hi = f"✅ **हाँ, ₹{target_amt:,.0f} की खरीदारी संभव है।**\n\nआपकी मासिक बचत ₹{net_savings:,.2f} है।"
            reply_mr = f"✅ **होय, ₹{target_amt:,.0f} ची खरेदी शक्य आहे.**\n\nतुमची मासिक बचत ₹{net_savings:,.2f} आहे।"

        reply = reply_hi if language == "hi" else (reply_mr if language == "mr" else reply_en)
        return {
            "reply": reply,
            "suggested_followups": [
                "What EMI can I safely afford?",
                "What if my income falls by 25%?",
                "Should I borrow or save first?"
            ],
            "data_citations": {"target_amount": target_amt, "estimated_emi": estimated_emi, "monthly_surplus": net_savings}
        }

    # Intent 5: General Financial Health & Recommendations
    else:
        active_loans_count = len([c for c in commitments if c["type"] == "LOAN"])
        active_bills_count = len([c for c in commitments if c["type"] == "BILL"])
        
        reply_en = (
            f"Here are 3 high-impact actions to strengthen your financial health based on your records:\n\n"
            f"1. **Establish a 7-Day Fuel Emergency Buffer (₹1,500):** Ensures you never miss lucrative weekend or festival delivery shifts due to zero wallet balance.\n"
            f"2. **Maintain On-Time Utility Recharges:** You have {active_bills_count} tracked bills. Recharging 48 hours before expiry builds a strong digital payment consistency track record.\n"
            f"3. **Cap Ad-Hoc UPI Outflows:** Your potential monthly savings across categories is **₹{context['potential_monthly_savings']:,.2f}** (₹{context['potential_annual_savings']:,.2f}/year). Directing this into your savings goals will elevate your credit profile.\n\n"
            f"Feel free to ask specific questions about your spending, scores, or saving goals!"
        )
        reply_hi = (
            f"आपके वित्तीय स्वास्थ्य को बेहतर बनाने के लिए 3 महत्वपूर्ण सुझाव:\n\n"
            f"1. **7 दिन का पेट्रोल रिज़र्व (₹1,500) अलग रखें:** ताकि व्यस्त समय में ईंधन की कमी से काम न रुके।\n"
            f"2. **समय से पहले रिचार्ज करें:** इससे आपका बिल पेमेंट ट्रैक रिकॉर्ड मजबूत होता है।\n"
            f"3. **अनियोजित खर्चों को सीमित करें:** आप हर महीने लगभग **₹{context['potential_monthly_savings']:,.2f}** बचा सकते हैं।"
        )
        reply_mr = (
            f"तुमचे आर्थिक आरोग्य सुधारण्यासाठी ३ महत्त्वाचे सल्ले:\n\n"
            f"1. **७ दिवसांचा पेट्रोल राखीव निधी (₹1,500) ठेवा.**\n"
            f"2. **मोबाईल व वीज बिल मुदतीपूर्वी भरा.**\n"
            f"3. **अनावश्यक खर्चावर नियंत्रण ठेवा:** तुम्ही दरमहा सुमारे **₹{context['potential_monthly_savings']:,.2f}** बचत करू शकता."
        )

        reply = reply_hi if language == "hi" else (reply_mr if language == "mr" else reply_en)
        return {
            "reply": reply,
            "suggested_followups": [
                "Where am I spending the most?",
                "How can I save ₹3,000 next month?",
                "Why is my Financial Trust Score low?"
            ],
            "data_citations": {"potential_monthly_savings": context["potential_monthly_savings"]}
        }

def query_ai_financial_coach(
    user_message: str, 
    context: Dict[str, Any], 
    language: str = "en"
) -> Dict[str, Any]:
    """
    Main entrypoint for chatbot queries.
    Tries Google Gemini or OpenAI if configured in environment,
    with an automatic fallback to the deterministic reasoning engine.
    """
    gemini_key = os.getenv("GEMINI_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")

    # 1. Try Google Gemini API if configured
    if gemini_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_key)
            model = genai.GenerativeModel("gemini-1.5-flash")

            user_context_prompt = (
                f"{SYSTEM_FINANCIAL_PROMPT}\n\n"
                f"VERIFIED FINANCIAL CONTEXT FOR AUTHENTICATED USER:\n"
                f"- Name: {context['user_name']}\n"
                f"- Worker Type: {context['worker_type']}\n"
                f"- City: {context['city']}\n"
                f"- Financial Trust Score: {context['trust_score']} (Status: {context['score_status']}, Months of data: {context['months_of_data']})\n"
                f"- Average Monthly Inflow: INR {context['avg_monthly_income']}\n"
                f"- Average Monthly Expenses: INR {context['avg_monthly_expenses']}\n"
                f"- Net Monthly Savings: INR {context['net_monthly_savings']}\n"
                f"- Potential Monthly Savings Identified: INR {context['potential_monthly_savings']}\n"
                f"- Spending Categories: {context['category_breakdown']}\n"
                f"- Savings Goals: {context['savings_goals']}\n"
                f"- Commitments & Repayments: {context['commitments']}\n"
                f"- Data Sufficiency: {context['is_sufficient']} ({context['sufficiency_note']})\n\n"
                f"USER QUESTION: {user_message}\n"
                f"REQUESTED LANGUAGE: {language}\n"
                f"Please reply in friendly, concise, markdown-formatted text."
            )

            res = model.generate_content(user_context_prompt)
            if res and res.text:
                return {
                    "reply": res.text.strip(),
                    "language": language,
                    "is_ai_powered": True,
                    "provider_used": "Google Gemini 1.5 Flash",
                    "suggested_followups": [
                        "Where am I spending the most?",
                        "How can I save ₹3,000 next month?",
                        "Why is my Financial Trust Score low?"
                    ],
                    "data_citations": {"trust_score": context["trust_score"], "avg_income": context["avg_monthly_income"]}
                }
        except Exception as e:
            print(f"[AI Coach Warning] Gemini query failed: {e}. Falling back to deterministic engine.")

    # 2. Try OpenAI API if configured
    if openai_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=openai_key)
            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": SYSTEM_FINANCIAL_PROMPT},
                    {
                        "role": "user",
                        "content": f"User Context: {context}\nQuestion: {user_message}\nLanguage: {language}"
                    }
                ],
                temperature=0.4,
                max_tokens=600
            )
            reply_text = completion.choices[0].message.content
            if reply_text:
                return {
                    "reply": reply_text.strip(),
                    "language": language,
                    "is_ai_powered": True,
                    "provider_used": "OpenAI GPT-4o-mini",
                    "suggested_followups": [
                        "Where am I spending the most?",
                        "How can I save ₹3,000 next month?",
                        "Why is my Financial Trust Score low?"
                    ],
                    "data_citations": {"trust_score": context["trust_score"], "avg_income": context["avg_monthly_income"]}
                }
        except Exception as e:
            print(f"[AI Coach Warning] OpenAI query failed: {e}. Falling back to deterministic engine.")

    # 3. Deterministic Grounded Reasoning Fallback
    deterministic_result = generate_deterministic_response(user_message, context, language)
    return {
        "reply": deterministic_result["reply"],
        "language": language,
        "is_ai_powered": False,
        "provider_used": "Deterministic Verified Reasoning Engine",
        "suggested_followups": deterministic_result.get("suggested_followups", []),
        "data_citations": deterministic_result.get("data_citations")
    }
