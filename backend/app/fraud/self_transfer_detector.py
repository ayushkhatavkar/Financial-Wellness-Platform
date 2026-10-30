from typing import List, Dict, Any, Optional
import re
from app.fraud.types import (
    FraudSeverity,
    FraudCategory,
    FraudAlertItem,
    mask_reference_id
)

SELF_TRANSFER_KEYWORDS = (
    "self transfer", "to self", "from self", "own account",
    "internal transfer", "transfer to own", "self account",
    "linked account", "same bank", "within bank self"
)

LOAN_KEYWORDS = (
    "loan disburs", "credit line", "loan credit", "sanction amount",
    "borrowing", "nbfc disburs", "fintech credit", "loan proceeds",
    "personal loan", "tw refinance", "micro loan", "disbursement"
)

REFUND_KEYWORDS = (
    "refund", "reversal", "chargeback", "reversed", "cashback reversal", "failed txn refund"
)

def detect_self_transfers_and_non_income(
    records: List[Dict[str, Any]],
    user_context: Optional[Dict[str, Any]] = None
) -> List[FraudAlertItem]:
    """
    Identifies transactions that represent:
      1. Internal fund movements between own accounts (SELF_001_INTERNAL_TRANSFER).
      2. Loan proceeds/disbursements incorrectly treated as earned income (SELF_002_LOAN_DISBURSEMENT).
      3. Refunds or reversals incorrectly counted as earnings (SELF_003_REFUND_REVERSAL).
      
    Flags these so they can be properly excluded from revenue/income calculations
    while remaining fully preserved in the user's ledger history.
    """
    alerts: List[FraudAlertItem] = []
    user_name = (user_context.get("full_name") or "").lower().strip() if user_context else ""

    for idx, rec in enumerate(records):
        desc = str(rec.get("description", "")).lower()
        amt = float(rec.get("amount", 0.0))
        t_type = str(rec.get("transaction_type", "")).upper()
        ref_id = rec.get("ref_id")
        masked_ref = mask_reference_id(ref_id)

        # 1. Internal / Self Transfer detection
        is_self = any(k in desc for k in SELF_TRANSFER_KEYWORDS)
        if not is_self and user_name and len(user_name) > 3:
            # Check if description mentions user's own name in transfer context
            if f"to {user_name}" in desc or f"from {user_name}" in desc or f"transfer to {user_name}" in desc:
                is_self = True

        if is_self:
            alerts.append(FraudAlertItem(
                rule_id="SELF_001_INTERNAL_TRANSFER",
                rule_name="Internal Self-Transfer Movement",
                category=FraudCategory.SELF_TRANSFER.value,
                severity=FraudSeverity.LOW.value,
                explanation=(
                    f"{t_type} of ₹{amt:,.2f} on {rec.get('transaction_date')} ('{rec.get('description')}') "
                    f"appears to be an internal transfer between your own accounts. Self-transfers should be classified as "
                    f"internal movements and excluded from earned gig income calculation."
                ),
                evidence={
                    "amount": amt,
                    "type": t_type,
                    "date": str(rec.get("transaction_date")),
                    "description": rec.get("description"),
                    "masked_reference": masked_ref,
                    "affected_rows": [idx + 1]
                },
                affected_indices=[idx],
                external_ref=ref_id,
                review_status="PENDING_REVIEW"
            ))
            continue

        # 2. Loan Disbursement incorrectly treated as income
        if t_type == "CREDIT" and any(k in desc for k in LOAN_KEYWORDS):
            alerts.append(FraudAlertItem(
                rule_id="SELF_002_LOAN_DISBURSEMENT",
                rule_name="Loan Disbursement in Credit Records",
                category=FraudCategory.SELF_TRANSFER.value,
                severity=FraudSeverity.MEDIUM.value,
                explanation=(
                    f"Credit of ₹{amt:,.2f} on {rec.get('transaction_date')} ('{rec.get('description')}') matches loan disbursement patterns. "
                    f"Borrowed capital must not inflate your earned operating income for alternative credit underwriting."
                ),
                evidence={
                    "amount": amt,
                    "date": str(rec.get("transaction_date")),
                    "description": rec.get("description"),
                    "masked_reference": masked_ref,
                    "affected_rows": [idx + 1]
                },
                affected_indices=[idx],
                external_ref=ref_id,
                review_status="PENDING_REVIEW"
            ))
            continue

        # 3. Refund / Reversal
        if (t_type == "CREDIT" and any(k in desc for k in REFUND_KEYWORDS)) or rec.get("is_refund"):
            alerts.append(FraudAlertItem(
                rule_id="SELF_003_REFUND_REVERSAL",
                rule_name="Refund or Chargeback Reversal",
                category=FraudCategory.SELF_TRANSFER.value,
                severity=FraudSeverity.LOW.value,
                explanation=(
                    f"Credit of ₹{amt:,.2f} on {rec.get('transaction_date')} ('{rec.get('description')}') is identified as a refund or reversal. "
                    f"Refunds return previously debited money and should not be counted as new earned income."
                ),
                evidence={
                    "amount": amt,
                    "date": str(rec.get("transaction_date")),
                    "description": rec.get("description"),
                    "masked_reference": masked_ref,
                    "affected_rows": [idx + 1]
                },
                affected_indices=[idx],
                external_ref=ref_id,
                review_status="PENDING_REVIEW"
            ))

    return alerts

