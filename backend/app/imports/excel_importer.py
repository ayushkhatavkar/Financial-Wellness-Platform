import os
import pandas as pd
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy.orm import Session
from app.models.entities import (
    User,
    Transaction,
    FinancialScore,
    LoanOffer,
    SavingsGoal,
    ConsentRecord
)
from app.core.security import hash_password

def import_excel_dataset(file_path: str, db: Session) -> dict:
    """
    Repeatable, idempotent Excel benchmark importer.
    Reads Users, Transactions, Scoring_Features, Loan_Offers, and Savings_Goals.
    Avoids duplicate entries when run multiple times.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Workbook not found at: {file_path}")

    xls = pd.ExcelFile(file_path)
    summary = {
        "users": {"inserted": 0, "skipped": 0},
        "transactions": {"inserted": 0, "skipped": 0},
        "scores": {"inserted": 0, "skipped": 0},
        "loan_offers": {"inserted": 0, "skipped": 0},
        "savings_goals": {"inserted": 0, "skipped": 0},
    }

    # 1. Import Users
    if "Users" in xls.sheet_names:
        users_df = pd.read_excel(xls, "Users")
        for _, row in users_df.iterrows():
            user_code = str(row["user_id"]).strip()
            existing = db.query(User).filter(User.user_code == user_code).first()
            if not existing:
                email = f"{user_code.lower()}@demo.sahayakfin.in"
                reg_date = row["registration_date"]
                if isinstance(reg_date, str):
                    reg_dt = datetime.strptime(reg_date.split("T")[0], "%Y-%m-%d")
                elif isinstance(reg_date, (datetime, pd.Timestamp)):
                    reg_dt = reg_date.to_pydatetime()
                else:
                    reg_dt = datetime.utcnow()

                new_user = User(
                    user_code=user_code,
                    email=email,
                    phone=f"+91 98{abs(hash(user_code)) % 100000000:08d}",
                    password_hash=hash_password("DemoPassword123"),
                    full_name=str(row["full_name"]),
                    worker_type=str(row["worker_type"]),
                    city=str(row["city"]),
                    preferred_language=str(row["preferred_language"]),
                    account_status=str(row["account_status"]),
                    is_demo=bool(row["demo_account"]),
                    created_at=reg_dt
                )
                db.add(new_user)
                db.flush()

                # Add default consent for demo users
                consent = ConsentRecord(
                    user_id=new_user.id,
                    purpose="FINANCIAL_ASSESSMENT_AND_SCORING",
                    is_active=True,
                    granted_at=reg_dt
                )
                db.add(consent)
                summary["users"]["inserted"] += 1
            else:
                summary["users"]["skipped"] += 1
        db.commit()

    # Pre-map user_code -> database user.id
    user_map = {u.user_code: u.id for u in db.query(User).all()}

    # 2. Import Transactions
    if "Transactions" in xls.sheet_names:
        tx_df = pd.read_excel(xls, "Transactions")
        for _, row in tx_df.iterrows():
            tx_id = str(row["transaction_id"]).strip()
            user_code = str(row["user_id"]).strip()
            db_user_id = user_map.get(user_code)

            if not db_user_id:
                continue

            existing = db.query(Transaction).filter(Transaction.id == tx_id).first()
            if not existing:
                tx_date = row["transaction_date"]
                if isinstance(tx_date, str):
                    d = datetime.strptime(tx_date.split("T")[0], "%Y-%m-%d").date()
                elif isinstance(tx_date, (datetime, pd.Timestamp)):
                    d = tx_date.date()
                else:
                    d = date.today()

                balance_val = row["balance"]
                bal = Decimal(str(balance_val)) if pd.notnull(balance_val) else None
                dup_of = str(row["duplicate_of_transaction_id"]).strip() if pd.notnull(row["duplicate_of_transaction_id"]) else None

                new_tx = Transaction(
                    id=tx_id,
                    user_id=db_user_id,
                    transaction_date=d,
                    description=str(row["description"]),
                    amount=Decimal(str(row["amount"])),
                    transaction_type=str(row["transaction_type"]).upper(),
                    balance=bal,
                    category=str(row["category"]),
                    payment_method=str(row["payment_method"]),
                    counterparty=str(row["counterparty"]),
                    status=str(row["transaction_status"]),
                    is_refund=bool(row["is_refund"]),
                    is_duplicate_test=bool(row["is_duplicate_test"]),
                    duplicate_of_transaction_id=dup_of,
                    is_excluded_from_scoring=bool(row["is_duplicate_test"]),
                    created_at=datetime.utcnow()
                )
                db.add(new_tx)
                summary["transactions"]["inserted"] += 1
            else:
                summary["transactions"]["skipped"] += 1
        db.commit()

    # 3. Import Loan Offers
    if "Loan_Offers" in xls.sheet_names:
        loans_df = pd.read_excel(xls, "Loan_Offers")
        for _, row in loans_df.iterrows():
            offer_id = str(row["offer_id"]).strip()
            existing = db.query(LoanOffer).filter(LoanOffer.id == offer_id).first()
            if not existing:
                new_offer = LoanOffer(
                    id=offer_id,
                    offer_name=str(row["offer_name"]),
                    fictional_provider_name=str(row["fictional_provider_name"]),
                    minimum_amount=Decimal(str(row["minimum_amount"])),
                    maximum_amount=Decimal(str(row["maximum_amount"])),
                    annual_interest_rate=Decimal(str(row["annual_interest_rate"])),
                    tenure_months=int(row["tenure_months"]),
                    processing_fee=Decimal(str(row["processing_fee"])),
                    processing_fee_type=str(row["processing_fee_type"]),
                    repayment_method=str(row["repayment_method"]),
                    eligibility_rule=str(row["eligibility_rule"]),
                    demo_offer=bool(row["demo_offer"]),
                    disclaimer=str(row["disclaimer"])
                )
                db.add(new_offer)
                summary["loan_offers"]["inserted"] += 1
            else:
                summary["loan_offers"]["skipped"] += 1
        db.commit()

    # 4. Import Savings Goals
    if "Savings_Goals" in xls.sheet_names:
        goals_df = pd.read_excel(xls, "Savings_Goals")
        for _, row in goals_df.iterrows():
            goal_id = str(row["goal_id"]).strip()
            user_code = str(row["user_id"]).strip()
            db_user_id = user_map.get(user_code)

            if not db_user_id:
                continue

            existing = db.query(SavingsGoal).filter(SavingsGoal.id == goal_id).first()
            if not existing:
                t_date = row["target_date"]
                if isinstance(t_date, str):
                    d = datetime.strptime(t_date.split("T")[0], "%Y-%m-%d").date()
                elif isinstance(t_date, (datetime, pd.Timestamp)):
                    d = t_date.date()
                else:
                    d = date.today()

                new_goal = SavingsGoal(
                    id=goal_id,
                    user_id=db_user_id,
                    goal_name=str(row["goal_name"]),
                    target_amount=Decimal(str(row["target_amount"])),
                    current_amount=Decimal(str(row["current_amount"])),
                    target_date=d,
                    status=str(row["status"]),
                    suggested_daily_saving=Decimal(str(row["suggested_daily_saving"])),
                    created_at=datetime.utcnow()
                )
                db.add(new_goal)
                summary["savings_goals"]["inserted"] += 1
            else:
                summary["savings_goals"]["skipped"] += 1
        db.commit()

    # 5. Import Precomputed Scores
    if "Scoring_Features" in xls.sheet_names:
        scoring_df = pd.read_excel(xls, "Scoring_Features")
        for _, row in scoring_df.iterrows():
            user_code = str(row["user_id"]).strip()
            db_user_id = user_map.get(user_code)

            if not db_user_id:
                continue

            existing = db.query(FinancialScore).filter(FinancialScore.user_id == db_user_id).first()
            if not existing:
                score_val = Decimal(str(row["financial_trust_score"])) if pd.notnull(row["financial_trust_score"]) else None
                income_ind = Decimal(str(row["income_stability_indicator"])) if pd.notnull(row["income_stability_indicator"]) else None
                savings_ind = Decimal(str(row["savings_consistency_indicator"])) if pd.notnull(row["savings_consistency_indicator"]) else None
                expense_ind = Decimal(str(row["expense_health_indicator"])) if pd.notnull(row["expense_health_indicator"]) else None
                bill_ind = Decimal(str(row["bill_payment_consistency_indicator"])) if pd.notnull(row["bill_payment_consistency_indicator"]) else None

                new_score = FinancialScore(
                    user_id=db_user_id,
                    score_value=score_val,
                    income_stability_indicator=income_ind,
                    savings_consistency_indicator=savings_ind,
                    expense_health_indicator=expense_ind,
                    bill_payment_consistency_indicator=bill_ind,
                    data_sufficiency_status=str(row["data_sufficiency_status"]),
                    months_of_data=int(row["months_of_data"]),
                    average_monthly_income=Decimal(str(row["average_monthly_income"])),
                    score_explanation=str(row["score_explanation"]),
                    calculation_version=str(row["calculation_version"]),
                    calculated_at=datetime.utcnow()
                )
                db.add(new_score)
                summary["scores"]["inserted"] += 1
            else:
                summary["scores"]["skipped"] += 1
        db.commit()

    return summary
