from typing import List, Dict, Any, Optional
import numpy as np
from app.fraud.types import (
    FraudSeverity,
    FraudCategory,
    FraudAlertItem,
    mask_reference_id
)

COMPARABLE_INCOME_CATEGORIES = {
    "GIG_INCOME", "GIG_PAYOUT", "BUSINESS_INCOME", 
    "CUSTOMER_TIP", "OPERATIONAL_INCOME", "OTHER_INCOME"
}

def detect_income_spikes(
    records: List[Dict[str, Any]],
    historical_transactions: Optional[List[Any]] = None
) -> List[FraudAlertItem]:
    """
    Analyzes income credits using Median & Median Absolute Deviation (MAD).
    Detects credits significantly larger than established historical earnings baseline.
    
    IMPORTANT:
      - Compares comparable income transactions (gig earnings/payouts), not loans or refunds.
      - Handles insufficient history gracefully without generating false alarms.
      - Avoids universal hardcoded rupee ceilings.
      - Produces an explainable risk explanation, NOT an automatic rejection.
    """
    alerts: List[FraudAlertItem] = []

    # 1. Gather all comparable income credits from this statement
    statement_income_credits: List[tuple] = [] # (index, amount, record)
    for idx, rec in enumerate(records):
        if rec.get("transaction_type") == "CREDIT" and not rec.get("is_refund") and not rec.get("is_excluded_from_scoring"):
            cat = str(rec.get("category", "")).upper()
            if cat in COMPARABLE_INCOME_CATEGORIES or not cat:
                amt = float(rec.get("amount", 0.0))
                if amt > 0:
                    statement_income_credits.append((idx, amt, rec))

    if not statement_income_credits:
        return alerts

    # 2. Gather historical amounts from DB if available
    historical_amounts: List[float] = []
    if historical_transactions:
        for tx in historical_transactions:
            if getattr(tx, "transaction_type", "") == "CREDIT" and not getattr(tx, "is_refund", False) and not getattr(tx, "is_excluded_from_scoring", False):
                cat = str(getattr(tx, "category", "")).upper()
                if cat in COMPARABLE_INCOME_CATEGORIES:
                    amt = float(getattr(tx, "amount", 0.0))
                    if amt > 0:
                        historical_amounts.append(amt)

    # Combined dataset for baseline
    all_income_amounts = historical_amounts + [amt for _, amt, _ in statement_income_credits]

    # Rule: If total comparable income points < 4, statistical baseline is insufficient
    if len(all_income_amounts) < 4:
        # Check only for extreme outlier (> ₹100,000 when rest are < ₹10,000)
        for idx, amt, rec in statement_income_credits:
            other_amts = [a for a in all_income_amounts if a != amt]
            if other_amts and amt >= 75000 and amt > (np.median(other_amts) * 6):
                med = float(np.median(other_amts))
                ref_id = rec.get("ref_id")
                alerts.append(FraudAlertItem(
                    rule_id="SPIKE_002_PROVISIONAL_INCOME_ANOMALY",
                    rule_name="Unusual Inflow Outlier (Provisional Baseline)",
                    category=FraudCategory.INCOME_SPIKE.value,
                    severity=FraudSeverity.MEDIUM.value,
                    explanation=(
                        f"Credit of ₹{amt:,.2f} on {rec.get('transaction_date')} is substantially larger than other observed credits "
                        f"(median observed: ₹{med:,.2f}). With limited history (< 4 income records), this is flagged for informational review "
                        f"rather than score penalty."
                    ),
                    evidence={
                        "credit_amount": amt,
                        "median_other_credits": round(med, 2),
                        "multiplier": round(amt / (med or 1), 1),
                        "transaction_date": str(rec.get("transaction_date")),
                        "description": rec.get("description"),
                        "masked_reference": mask_reference_id(ref_id),
                        "sample_size": len(all_income_amounts),
                        "affected_rows": [idx + 1]
                    },
                    affected_indices=[idx],
                    external_ref=ref_id,
                    review_status="PENDING_REVIEW"
                ))
        return alerts

    # 3. Robust Median & MAD calculation
    data = np.array(all_income_amounts, dtype=float)
    median_val = float(np.median(data))
    abs_deviations = np.abs(data - median_val)
    mad_val = float(np.median(abs_deviations))

    # Guard against zero MAD (e.g. all transactions are identical amounts like ₹5,000)
    effective_mad = mad_val if mad_val > 0 else (0.25 * median_val if median_val > 0 else 1000.0)

    for idx, amt, rec in statement_income_credits:
        # Calculate Modified Z-score: 0.6745 * (x - median) / MAD
        mod_z = 0.6745 * (amt - median_val) / effective_mad
        ratio_to_median = amt / median_val if median_val > 0 else 1.0

        # Outlier condition:
        # 1. Modified Z-Score > 3.5 (standard statistical outlier)
        # 2. Amount is at least 3.0x the median payout
        # 3. Absolute amount is at least ₹15,000 (prevents flagging small variation)
        if mod_z >= 3.5 and ratio_to_median >= 3.0 and amt >= 15000:
            severity = FraudSeverity.HIGH.value if (ratio_to_median >= 5.0 or amt >= 60000) else FraudSeverity.MEDIUM.value
            ref_id = rec.get("ref_id")
            masked_ref = mask_reference_id(ref_id)

            alerts.append(FraudAlertItem(
                rule_id="SPIKE_001_STATISTICAL_MAD_OUTLIER",
                rule_name="Abnormal Inflow Spike vs Established Earnings",
                category=FraudCategory.INCOME_SPIKE.value,
                severity=severity,
                explanation=(
                    f"Credit of ₹{amt:,.2f} on {rec.get('transaction_date')} is {ratio_to_median:.1f}x higher than your established "
                    f"median earnings payout (₹{median_val:,.2f}, MAD: ₹{effective_mad:,.2f}, Modified Z-Score: {mod_z:.1f}). "
                    f"Flagged for manual verification (e.g. platform incentive, seasonal bonus, asset sale) to prevent miscalculated score inflation."
                ),
                evidence={
                    "credit_amount": amt,
                    "established_median": round(median_val, 2),
                    "mad": round(effective_mad, 2),
                    "modified_z_score": round(mod_z, 2),
                    "ratio_to_median": round(ratio_to_median, 1),
                    "transaction_date": str(rec.get("transaction_date")),
                    "description": rec.get("description"),
                    "masked_reference": masked_ref,
                    "baseline_sample_size": len(all_income_amounts),
                    "affected_rows": [idx + 1]
                },
                affected_indices=[idx],
                external_ref=ref_id,
                review_status="PENDING_REVIEW"
            ))

    return alerts

