from typing import List, Dict, Any, Optional
from datetime import date, datetime, timedelta
from app.fraud.types import (
    FraudSeverity,
    FraudCategory,
    FraudAlertItem,
    mask_counterparty,
    mask_reference_id
)

def parse_date(d: Any) -> Optional[date]:
    if isinstance(d, date):
        return d
    if isinstance(d, datetime):
        return d.date()
    if isinstance(d, str):
        try:
            return datetime.strptime(d[:10], "%Y-%m-%d").date()
        except Exception:
            return None
    return None

def normalize_counterparty(cp: Optional[str]) -> str:
    if not cp:
        return ""
    cleaned = cp.strip().lower()
    # Normalize common prefixes
    for prefix in ("paid to ", "payment to ", "received from ", "transfer to ", "from "):
        if cleaned.startswith(prefix):
            cleaned = cleaned[len(prefix):].strip()
    return cleaned

def detect_circular_transactions(
    records: List[Dict[str, Any]],
    time_window_days: int = 5,
    amount_tolerance_ratio: float = 0.05
) -> List[FraudAlertItem]:
    """
    Detects reciprocal transfer patterns where funds flow in from counterparty X
    and nearly identical amounts flow back out to counterparty X within a short window,
    or repeat multiple times.
    
    IMPORTANT: Flags as 'Potential fund cycling / reciprocal movements for manual review',
    explicitly avoiding claims of proven multi-account circularity.
    """
    alerts: List[FraudAlertItem] = []
    credits = []
    debits = []

    for idx, rec in enumerate(records):
        d = parse_date(rec.get("transaction_date"))
        amt = float(rec.get("amount", 0.0))
        t_type = str(rec.get("transaction_type", "")).upper()
        cp = normalize_counterparty(rec.get("counterparty") or rec.get("description"))

        if d and amt > 0:
            if t_type == "CREDIT":
                credits.append((idx, d, amt, cp, rec))
            elif t_type == "DEBIT":
                debits.append((idx, d, amt, cp, rec))

    matched_pairs = []
    used_debits = set()

    for c_idx, c_date, c_amt, c_cp, c_rec in credits:
        # Ignore legitimate platform gig earnings from circular analysis
        if c_rec.get("category") == "GIG_INCOME" or any(p in c_cp for p in ("swiggy", "zomato", "uber", "ola", "zepto", "blinkit", "rapido")):
            continue

        for d_idx, d_date, d_amt, d_cp, d_rec in debits:
            if d_idx in used_debits:
                continue

            day_diff = abs((d_date - c_date).days)
            if day_diff > time_window_days:
                continue

            # Amount difference tolerance (e.g. within 5%)
            amt_diff = abs(c_amt - d_amt)
            max_amt = max(c_amt, d_amt)
            if max_amt > 0 and (amt_diff / max_amt) <= amount_tolerance_ratio:
                # Counterparty similarity check if available
                cp_match = False
                if c_cp and d_cp and (c_cp in d_cp or d_cp in c_cp or c_cp == d_cp):
                    cp_match = True
                elif not c_cp or not d_cp or c_cp in ("unknown", "self/vendor") or d_cp in ("unknown", "self/vendor"):
                    # Check if exact amount in narrow time window (<= 2 days)
                    if amt_diff == 0.0 and day_diff <= 2 and c_amt >= 2000.0:
                        cp_match = True

                if cp_match:
                    matched_pairs.append({
                        "credit_idx": c_idx,
                        "debit_idx": d_idx,
                        "credit_rec": c_rec,
                        "debit_rec": d_rec,
                        "amount_in": c_amt,
                        "amount_out": d_amt,
                        "credit_date": c_date,
                        "debit_date": d_date,
                        "day_diff": day_diff,
                        "counterparty": c_cp or d_cp
                    })
                    used_debits.add(d_idx)
                    break

    if not matched_pairs:
        return alerts

    # Group reciprocal transactions
    total_cycled_volume = sum(p["amount_in"] for p in matched_pairs)
    affected_indices = list(set([p["credit_idx"] for p in matched_pairs] + [p["debit_idx"] for p in matched_pairs]))

    # Severity depends on count of reciprocal cycles and volume
    severity = FraudSeverity.HIGH.value if (len(matched_pairs) >= 2 or total_cycled_volume >= 25000) else FraudSeverity.MEDIUM.value

    counterparties_masked = [mask_counterparty(p["counterparty"]) for p in matched_pairs[:3]]
    cp_summary = ", ".join(set([c for c in counterparties_masked if c != "Unknown"])) or "peer contacts"

    pair_details = []
    for p in matched_pairs:
        pair_details.append({
            "credit_date": str(p["credit_date"]),
            "debit_date": str(p["debit_date"]),
            "credit_amount": p["amount_in"],
            "debit_amount": p["amount_out"],
            "counterparty_masked": mask_counterparty(p["counterparty"]),
            "days_apart": p["day_diff"],
            "credit_row": p["credit_idx"] + 1,
            "debit_row": p["debit_idx"] + 1
        })

    alerts.append(FraudAlertItem(
        rule_id="CIRC_001_RECIPROCAL_TRANSFER",
        rule_name="Potential Reciprocal Fund Cycling",
        category=FraudCategory.CIRCULAR_TRANSFER.value,
        severity=severity,
        explanation=(
            f"Detected {len(matched_pairs)} potential reciprocal transfer pattern(s) totalling ₹{total_cycled_volume:,.2f} "
            f"involving {cp_summary} within {time_window_days}-day windows. Funds credited were followed shortly by reciprocal debits. "
            f"Review recommended to confirm whether these represent circular cash recycling or legitimate operational advances."
        ),
        evidence={
            "cycle_count": len(matched_pairs),
            "total_volume": total_cycled_volume,
            "pairs": pair_details,
            "affected_rows": [i + 1 for i in sorted(affected_indices)]
        },
        affected_indices=sorted(affected_indices),
        external_ref=None,
        review_status="PENDING_REVIEW"
    ))

    return alerts

