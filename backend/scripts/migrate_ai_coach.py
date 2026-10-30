"""
Migration script to create:
1. budget_recommendations table
2. chat_message_records table
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.db.session import engine
from sqlalchemy import text

def run_migration():
    print("Running migration for AI Financial Coach & Spending Analyzer tables...")
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS budget_recommendations (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                category VARCHAR(50) NOT NULL,
                category_label VARCHAR(100) NOT NULL,
                current_monthly_spend NUMERIC(12, 2) NOT NULL,
                suggested_monthly_limit NUMERIC(12, 2) NOT NULL,
                expected_monthly_savings NUMERIC(12, 2) NOT NULL,
                expected_annual_savings NUMERIC(12, 2) NOT NULL,
                reason TEXT NOT NULL,
                status VARCHAR(20) DEFAULT 'PENDING' NOT NULL, -- PENDING, ACCEPTED, DISMISSED
                linked_goal_id VARCHAR(36) REFERENCES savings_goals(id) ON DELETE SET NULL,
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc') NOT NULL,
                updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc') NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_budget_rec_user ON budget_recommendations(user_id);
            CREATE INDEX IF NOT EXISTS idx_budget_rec_cat ON budget_recommendations(user_id, category);
        """))
        print("[OK] budget_recommendations table created/verified.")

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS chat_message_records (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                role VARCHAR(20) NOT NULL, -- user, assistant
                content TEXT NOT NULL,
                language VARCHAR(10) DEFAULT 'en' NOT NULL,
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc') NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_chat_msg_user ON chat_message_records(user_id, created_at);
        """))
        print("[OK] chat_message_records table created/verified.")

if __name__ == "__main__":
    run_migration()
