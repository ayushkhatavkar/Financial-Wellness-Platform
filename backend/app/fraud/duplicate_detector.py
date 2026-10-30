from typing import List, Dict, Any, Optional
from collections import defaultdict
from app.fraud.types import (
    FraudSeverity,
    FraudCategory,
    FraudAlertItem,
    mask_reference_id
)

def is_genuine_external_ref(ref: Optional[str]) -> bool:
    """Check if reference ID is a genuine external banking/UPI reference rather than generated row fallback."""
    if not ref:
        return False
    ref_clean = str(ref).strip()
    if not ref_clean or ref_clean in ("-", "--", "NA", "N/A", "null", "none"):
        return False
    if ref_clean.upper().startswith("CSV-"):
        return False
    # Genuine bank references or UPI UTRs typically have at least 4 alphanumeric characters
    return len(ref_clean) >= 4

def detect_duplicates(
    records: List[Dict[str, Any]],
    existing_transactions: Optional[List[Any]] = None
) -> List[FraudAlertItem]:
    """
    Detects:
      1. Repeated genuine external UTR/Txn IDs within statement (DUP_001_UTR_REPEAT).
      2. Conflicting transactions sharing identical external reference (DUP_002_CONFLICTING_REF).
      3. Identical transaction tuples within statement without UTR (DUP_003_STATEMENT_COLLISION).
      4. Transactions previously imported into database (DUP_004_EXISTING_DB_DUPLICATE).
    """
    alerts: List[FraudAlertItem] = []

    # Map genuine external references to indices
    ref_map: Dict[str, List[int]] = defaultdict(list)
    # Map (date, amount, type, description) to indices
    tuple_map: Dict[tuple, List[int]] = defaultdict(list)

    for idx, rec in enumerate(records):
        ref_id = rec.get("ref_id")
        if is_genuine_external_ref(ref_id):
            ref_map[str(ref_id).strip()].append(idx)

        # Canonical signature: date, rounded amount, type, normalized desc
        date_val = str(rec.get("transaction_date", ""))
        amount_val = float(rec.get("amount", 0.0))
        type_val = str(rec.get("transaction_type", "")).upper()
        desc_norm = " ".join(str(rec.get("description", "")).lower().split())
        tuple_map[(date_val, round(amount_val, 2), type_val, desc_norm)].append(idx)

    # 1 & 2: Check reference collisions
    for ref_id, indices in ref_map.items():
        if len(indices) > 1:
            masked_ref = mask_reference_id(ref_id)
            # Check if all colliding rows have identical or conflicting attributes
            amounts = [float(records[i].get("amount", 0.0)) for i in indices]
            dates = [str(records[i].get("transaction_date", "")) for i in indices]
            types = [str(records[i].get("transaction_type", "")) for i in indices]

            has_conflict = (len(set(amounts)) > 1) or (len(set(dates)) > 1) or (len(set(types)) > 1)

            if has_conflict:
                alerts.append(FraudAlertItem(
                    rule_id="DUP_002_CONFLICTING_REF",
                    rule_name="Conflicting Transaction with Shared Reference",
                    category=FraudCategory.DUPLICATE.value,
                    severity=FraudSeverity.HIGH.value,
                    explanation=(
                        f"External banking reference {masked_ref} is attached to {len(indices)} conflicting entries "
                        f"with differing amounts, dates, or transaction types. This may indicate reference tampering or record collision."
                    ),
                    evidence={
                        "masked_reference": masked_ref,
                        "raw_reference": ref_id,
                        "occurrence_count": len(indices),
                        "amounts": amounts,
                        "dates": dates,
                        "types": types,
                        "affected_rows": [i + 1 for i in indices]
                    },
                    affected_indices=indices,
                    external_ref=ref_id
                ))
            else:
                alerts.append(FraudAlertItem(
                    rule_id="DUP_001_UTR_REPEAT",
                    rule_name="Duplicate Banking Reference / UTR",
                    category=FraudCategory.DUPLICATE.value,
                    severity=FraudSeverity.HIGH.value,
                    explanation=(
                        f"The exact external reference {masked_ref} appears {len(indices)} times within this statement. "
                        f"Repeated entries sharing the same banking reference should be deduplicated to prevent artificial score inflation."
                    ),
                    evidence={
                        "masked_reference": masked_ref,
                        "raw_reference": ref_id,
                        "occurrence_count": len(indices),
                        "amount": amounts[0],
                        "date": dates[0],
                        "affected_rows": [i + 1 for i in indices]
                    },
                    affected_indices=indices,
                    external_ref=ref_id
                ))

    # 3: Check identical entries without genuine reference
    for sig, indices in tuple_map.items():
        if len(indices) > 1:
            # Check if this group was already flagged by UTR collision
            already_covered = any(
                is_genuine_external_ref(records[i].get("ref_id")) and str(records[i].get("ref_id")).strip() in ref_map
                for i in indices
            )
            if not already_covered:
                date_val, amount_val, type_val, desc_val = sig
                alerts.append(FraudAlertItem(
                    rule_id="DUP_003_STATEMENT_COLLISION",
                    rule_name="Identical Statement Row Entries",
                    category=FraudCategory.DUPLICATE.value,
                    severity=FraudSeverity.MEDIUM.value,
                    explanation=(
                        f"{len(indices)} identical {type_val} transactions of ₹{amount_val:,.2f} on {date_val} "
                        f"('{desc_val[:40]}') detected in this statement. Review to avoid double-counting."
                    ),
                    evidence={
                        "date": date_val,
                        "amount": amount_val,
                        "type": type_val,
                        "description": desc_val,
                        "occurrence_count": len(indices),
                        "affected_rows": [i + 1 for i in indices]
                    },
                    affected_indices=indices,
                    external_ref=None
                ))

    # 4: Check against existing transactions in the database (if provided)
    if existing_transactions:
        db_refs = {}
        db_signatures = set()
        for tx in existing_transactions:
            if hasattr(tx, "duplicate_of_transaction_id") and is_genuine_external_ref(tx.duplicate_of_transaction_id):
                db_refs[str(tx.duplicate_of_transaction_id).strip()] = tx
            if hasattr(tx, "transaction_date") and hasattr(tx, "amount"):
                t_date = str(tx.transaction_date)
                t_amt = round(float(tx.amount), 2)
                t_type = str(tx.transaction_type).upper()
                t_desc = " ".join(str(tx.description or "").lower().split())
                db_signatures.add((t_date, t_amt, t_type, t_desc))

        for idx, rec in enumerate(records):
            ref_id = rec.get("ref_id")
            if is_genuine_external_ref(ref_id) and str(ref_id).strip() in db_refs:
                masked_ref = mask_reference_id(ref_id)
                alerts.append(FraudAlertItem(
                    rule_id="DUP_004_EXISTING_DB_DUPLICATE",
                    rule_name="Previously Ingested Reference Collision",
                    category=FraudCategory.DUPLICATE.value,
                    severity=FraudSeverity.HIGH.value,
                    explanation=(
                        f"External banking reference {masked_ref} already exists in your previously verified transaction ledger. "
                        f"This transaction will be flagged as an existing entry to prevent duplicate counting."
                    ),
                    evidence={
                        "masked_reference": masked_ref,
                        "raw_reference": ref_id,
                        "amount": float(rec.get("amount", 0.0)),
                        "date": str(rec.get("transaction_date", "")),
                        "affected_rows": [idx + 1]
                    },
                    affected_indices=[idx],
                    external_ref=str(ref_id).strip()
                ))

    return alerts

