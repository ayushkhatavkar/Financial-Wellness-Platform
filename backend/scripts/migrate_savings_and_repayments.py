"""
Migration script to create:
1. savings_goal_contributions table
2. payment_records table
3. Add facility_type, total_principal, is_recurring, frequency, notes to repayments table
4. Seed demo repayments and bills for USER0001 (Nitin Kulkarni)
"""
import sys
import os
from datetime import date, timedelta
from decimal import Decimal

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.db.session import engine, SessionLocal, Base
from sqlalchemy import text
from app.models.entities import User, Repayment, SavingsGoal

def run_migration():
    print("Running migration for savings contributions and repayment/bill enhancements...")
    if engine.url.drivername.startswith("sqlite"):
        Base.metadata.create_all(bind=engine)
        print("[OK] SQLite tables and schema verified via Base.metadata.")
    else:
        with engine.begin() as conn:
            # 1. Update repayments table columns
            conn.execute(text("""
                ALTER TABLE repayments 
                ADD COLUMN IF NOT EXISTS facility_type VARCHAR(20) DEFAULT 'LOAN' NOT NULL,
                ADD COLUMN IF NOT EXISTS total_principal NUMERIC(12, 2) NULL,
                ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE NOT NULL,
                ADD COLUMN IF NOT EXISTS frequency VARCHAR(20) DEFAULT 'MONTHLY' NOT NULL,
                ADD COLUMN IF NOT EXISTS notes TEXT NULL;
            """))
            print("[OK] repayments table updated with new columns.")

            # 2. Create savings_goal_contributions table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS savings_goal_contributions (
                    id VARCHAR(36) PRIMARY KEY,
                    goal_id VARCHAR(36) NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
                    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    amount NUMERIC(12, 2) NOT NULL,
                    contribution_date DATE NOT NULL,
                    note TEXT NULL,
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc') NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_contrib_goal ON savings_goal_contributions(goal_id);
                CREATE INDEX IF NOT EXISTS idx_contrib_user ON savings_goal_contributions(user_id);
            """))
            print("[OK] savings_goal_contributions table created/verified.")

            # 3. Create payment_records table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS payment_records (
                    id VARCHAR(36) PRIMARY KEY,
                    repayment_id VARCHAR(36) NOT NULL REFERENCES repayments(id) ON DELETE CASCADE,
                    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    amount_paid NUMERIC(12, 2) NOT NULL,
                    payment_date DATE NOT NULL,
                    payment_method VARCHAR(30) DEFAULT 'UPI' NOT NULL,
                    notes TEXT NULL,
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc') NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_payment_repayment ON payment_records(repayment_id);
                CREATE INDEX IF NOT EXISTS idx_payment_user ON payment_records(user_id);
            """))
            print("[OK] payment_records table created/verified.")

    # 4. Seed demo commitments for USER0001 (Nitin Kulkarni) if empty
    db = SessionLocal()
    try:
        nitin = db.query(User).filter(User.email == "user0001@demo.sahayakfin.in").first()
        if nitin:
            count = db.query(Repayment).filter(Repayment.user_id == nitin.id).count()
            if count == 0:
                print("Seeding initial loan and bills for Nitin Kulkarni (USER0001)...")
                today = date.today()
                
                # 1. Bike Working Capital Loan (Active Loan)
                loan1 = Repayment(
                    user_id=nitin.id,
                    facility_type="LOAN",
                    loan_name="Two-Wheeler Refinance Loan",
                    provider="Kavach MicroFin",
                    installment_amount=Decimal("1250.00"),
                    due_date=today + timedelta(days=5),
                    total_principal=Decimal("15000.00"),
                    principal_remaining=Decimal("3750.00"),
                    status="UPCOMING",
                    is_recurring=True,
                    frequency="MONTHLY",
                    notes="Vehicle refinance for delivery motorbike. Auto-deductible."
                )
                
                # 2. Airtel Postpaid & Data Plan (Recurring Bill - Due Soon)
                bill1 = Repayment(
                    user_id=nitin.id,
                    facility_type="BILL",
                    loan_name="Airtel 5G Delivery Unlimited Pack",
                    provider="Airtel Telecom",
                    installment_amount=Decimal("399.00"),
                    due_date=today + timedelta(days=2),
                    total_principal=None,
                    principal_remaining=Decimal("0.00"),
                    status="UPCOMING",
                    is_recurring=True,
                    frequency="MONTHLY",
                    notes="Essential navigation & customer call data plan."
                )

                # 3. Electricity Bill (Overdue Bill)
                bill2 = Repayment(
                    user_id=nitin.id,
                    facility_type="BILL",
                    loan_name="Apartment BESCOM Electricity",
                    provider="BESCOM Bangalore",
                    installment_amount=Decimal("850.00"),
                    due_date=today - timedelta(days=3),
                    total_principal=None,
                    principal_remaining=Decimal("0.00"),
                    status="OVERDUE",
                    is_recurring=True,
                    frequency="MONTHLY",
                    notes="Residential electricity for charging EV battery."
                )

                db.add_all([loan1, bill1, bill2])
                db.commit()
                print("[OK] Seeded 1 loan and 2 bills for USER0001.")

            # Also check initial contributions for existing savings goals
            goals = db.query(SavingsGoal).filter(SavingsGoal.user_id == nitin.id).all()
            for g in goals:
                res = db.execute(text("SELECT COUNT(*) FROM savings_goal_contributions WHERE goal_id = :gid"), {"gid": g.id}).scalar()
                if res == 0 and float(g.current_amount) > 0:
                    import uuid
                    db.execute(text("""
                        INSERT INTO savings_goal_contributions (id, goal_id, user_id, amount, contribution_date, note)
                        VALUES (:id, :gid, :uid, :amt, :dt, :note)
                    """), {
                        "id": str(uuid.uuid4()),
                        "gid": g.id,
                        "uid": nitin.id,
                        "amt": g.current_amount,
                        "dt": date.today(),
                        "note": "Initial Seed Deposit"
                    })
            db.commit()
            print("[OK] Verified existing savings goal contributions.")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
