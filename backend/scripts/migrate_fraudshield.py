import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import engine, Base
from sqlalchemy import text, inspect
import app.models.entities

def run_migration():
    print("Running migration for SahayakFin FraudShield...")
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    # 1. Create fraud_analysis_runs and fraud_alerts if they don't exist
    Base.metadata.create_all(bind=engine)
    print("[OK] FraudShield tables verified.")

    # 2. Add columns to transactions if missing
    tx_cols = [c["name"] for c in inspector.get_columns("transactions")]
    
    with engine.begin() as conn:
        if "exclusion_reason" not in tx_cols:
            conn.execute(text("ALTER TABLE transactions ADD COLUMN exclusion_reason TEXT NULL"))
            print("[OK] Added exclusion_reason to transactions.")
        if "fraud_review_status" not in tx_cols:
            conn.execute(text("ALTER TABLE transactions ADD COLUMN fraud_review_status VARCHAR(30) NULL"))
            print("[OK] Added fraud_review_status to transactions.")
        if "fraud_risk_score" not in tx_cols:
            conn.execute(text("ALTER TABLE transactions ADD COLUMN fraud_risk_score NUMERIC(5, 2) NULL"))
            print("[OK] Added fraud_risk_score to transactions.")

    print("[SUCCESS] FraudShield migration completed.")

if __name__ == "__main__":
    run_migration()
