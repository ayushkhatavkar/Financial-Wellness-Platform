"""
Reclassify existing transactions in PostgreSQL using updated infer_category_and_flags.
Safe, idempotent, preserves all dates, amounts, and user isolation.
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.db.session import SessionLocal
from app.models.entities import Transaction, User
from app.imports.statement_parser import infer_category_and_flags

def reclassify_all():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print(f"Total registered users found: {len(users)}")

        total_updated = 0
        for user in users:
            txs = db.query(Transaction).filter(Transaction.user_id == user.id).all()
            user_updated = 0
            for tx in txs:
                desc = tx.description or ""
                old_cat = tx.category
                new_cat, is_discretionary, is_internal = infer_category_and_flags(desc, tx.transaction_type)
                
                # Update category if different
                if old_cat != new_cat:
                    tx.category = new_cat
                    user_updated += 1
            
            if user_updated > 0:
                print(f"User {user.email} (ID: {user.id}): reclassified {user_updated}/{len(txs)} transactions.")
                total_updated += user_updated

        db.commit()
        print(f"Total transactions reclassified and saved to DB: {total_updated}")
    except Exception as e:
        db.rollback()
        print(f"Error during reclassification: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    reclassify_all()
