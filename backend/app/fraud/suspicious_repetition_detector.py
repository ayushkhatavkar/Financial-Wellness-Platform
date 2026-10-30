from typing import List, Dict, Any, Optional
from collections import defaultdict
from datetime import date, datetime, timedelta
from app.fraud.types import (
    FraudSeverity,
    FraudCategory,
    FraudAlertItem,
    mask_counterparty
)

LEGITIMATE_RECURRING_KEYWORDS = (
    "bescom", "electricity", "airtel", "jio", "bsnl", "vodafone",
    "rent", "maintenance", "recharge", "broadband", "water bill",
    "gas bill", "cylinder", "swiggy", "zomato", "uber", "ola", "zepto", "blinkit"
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

def detect_suspicious_repetitions(
    records: List[Dict[str, Any]],
    burst_window_hours: int = 72,
    min_burst_count: int = 3
) -> List[FraudAlertItem]:
    """
    Identifies unusually rapid bursts of identical amounts with the same counterparty
    within a short time window (e.g. 3+ transactions of exact same amount within 3 days).
    
    IMPORTANT:
      - Ignores normal monthly rent or utility payments.
      - Ignores verified weekly platform gig payouts.
      - Flags rapid micro-splitting or round-trip repetitive bursts.
    """
    alerts: List[FraudAlertItem] = []

    # Group by (amount, counterparty_or_desc_key, type)
    groups: Dict[tuple, List[tuple]] = defaultdict(list) # (idx, date, record)

    for idx, rec in enumerate(records):
        desc = str(rec.get("description", "")).lower()
        # Skip legitimate recurring utilities or gig platforms
        if any(k in desc for k in LEGITIMATE_RECURRING_KEYWORDS):
            continue
        if rec.get("category") in ("UTILITIES", "GIG_INCOME", "GIG_PAYOUT"):
            continue

        d = parse_date(rec.get("transaction_date"))
        amt = float(rec.get("amount", 0.0))
        t_type = str(rec.get("transaction_type", "")).upper()
        cp = str(rec.get("counterparty") or rec.get("description", "")).strip().lower()

        if d and amt >= 1000.0: # Only analyze non-trivial amounts
            groups[(round(amt, 2), cp[:30], t_type)].append((idx, d, rec))

    for (amt, cp_key, t_type), items in groups.items():
        if len(items) >= min_burst_count:
            # Sort by date
            items.sort(key=lambda x: x[1])
            # Check if at least min_burst_count fall within burst_window_hours (e.g. 3 days)
            start_date = items[0][1]
            end_date = items[-1][1]
            day_span = (end_date - start_date).days

            # If 3 or more occurrences happened within <= 4 calendar days
            if day_span <= 4:
                affected_indices = [x[0] for x in items]
                masked_cp = mask_counterparty(items[0][2].get("counterparty") or cp_key)
                total_burst_val = amt * len(items)

                alerts.append(FraudAlertItem(
                    rule_id="REP_001_BURST_IDENTICAL_AMOUNTS",
                    rule_name="Rapid Burst of Identical Amount Transactions",
                    category=FraudCategory.SUSPICIOUS_REPETITION.value,
                    severity=FraudSeverity.MEDIUM.value if total_burst_val < 30000 else FraudSeverity.HIGH.value,
                    explanation=(
                        f"Detected {len(items)} identical {t_type} transactions of exactly ₹{amt:,.2f} "
                        f"totalling ₹{total_burst_val:,.2f} with '{masked_cp}' across {day_span + 1} day(s). "
                        f"Unusual high-frequency identical amounts warrant review to verify they are legitimate repeated payments "
                        f"rather than artificial volume generation or transaction splitting."
                    ),
                    evidence={
                        "repetition_count": len(items),
                        "unit_amount": amt,
                        "total_volume": total_burst_val,
                        "time_span_days": day_span + 1,
                        "masked_counterparty": masked_cp,
                        "transaction_type": t_type,
                        "dates": [str(x[1]) for x in items],
                        "affected_rows": [i + 1 for i in affected_indices]
                    },
                    affected_indices=affected_indices,
                    external_ref=None,
                    review_status="PENDING_REVIEW"
                ))

    return alerts

