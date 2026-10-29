import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.db.session import SessionLocal
from app.models.entities import Transaction, User

def debug_txns():
    db = SessionLocal()
    u = db.query(User).filter(User.email.like('%phonepe%')).first()
    if not u:
        u = db.query(User).first()
    print(f"User: {u.email}")
    txns = db.query(Transaction).filter(Transaction.user_id == u.id).all()
    print(f"Total transactions: {len(txns)}")
    for t in txns[:5]:
        print(f"  status={repr(t.status)}, is_dup={repr(t.is_duplicate_test)}, is_excl={repr(t.is_excluded_from_scoring)}, type={repr(t.transaction_type)}, cat={repr(t.category)}, amt={repr(t.amount)}")
    
    debits = [t for t in txns if t.transaction_type == "DEBIT"]
    print(f"Total debits: {len(debits)}")
    for d in debits[:5]:
        print(f"  debit: status={d.status}, is_dup={d.is_duplicate_test}, is_excl={d.is_excluded_from_scoring}, cat={d.category}, amt={d.amount}")
    db.close()

if __name__ == '__main__':
    debug_txns()
