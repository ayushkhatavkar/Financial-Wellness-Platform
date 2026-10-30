from typing import List, Dict, Any, Optional, Set
from app.fraud.types import (
    FraudSeverity,
    FraudCategory,
    OverallStatus,
    FraudAlertItem,
    IntegrityReportData
)
from app.fraud.duplicate_detector import detect_duplicates
from app.fraud.circular_detector import detect_circular_transactions
from app.fraud.income_spike_detector import detect_income_spikes
from app.fraud.self_transfer_detector import detect_self_transfers_and_non_income
from app.fraud.suspicious_repetition_detector import detect_suspicious_repetitions

class FraudShieldEngine:
    """
    Main orchestrator for SahayakFin FraudShield.
    Executes all 5 detection modules in a deterministic, privacy-preserving pipeline.
    """

    @classmethod
    def analyze_transactions(
        cls,
        records: List[Dict[str, Any]],
        existing_transactions: Optional[List[Any]] = None,
        user_context: Optional[Dict[str, Any]] = None
    ) -> IntegrityReportData:
        total_analyzed = len(records)
        all_alerts: List[FraudAlertItem] = []

        if total_analyzed == 0:
            return IntegrityReportData(
                overall_status=OverallStatus.INSUFFICIENT_DATA.value,
                total_analyzed=0,
                flagged_count=0,
                anomaly_score=0.0,
                category_counts={cat.value: 0 for cat in FraudCategory},
                alerts=[],
                summary_notes="No transaction records available to analyze."
            )

        # 1. Duplicate detection
        dup_alerts = detect_duplicates(records, existing_transactions=existing_transactions)
        all_alerts.extend(dup_alerts)

        # 2. Circular transfer detection
        circ_alerts = detect_circular_transactions(records)
        all_alerts.extend(circ_alerts)

        # 3. Abnormal income spike detection
        spike_alerts = detect_income_spikes(records, historical_transactions=existing_transactions)
        all_alerts.extend(spike_alerts)

        # 4. Self-transfer and non-income detection
        self_alerts = detect_self_transfers_and_non_income(records, user_context=user_context)
        all_alerts.extend(self_alerts)

        # 5. Suspicious repetition detection
        rep_alerts = detect_suspicious_repetitions(records)
        all_alerts.extend(rep_alerts)

        # Collect affected transaction indices
        flagged_indices: Set[int] = set()
        for alert in all_alerts:
            flagged_indices.update(alert.affected_indices)

        # Count alerts by category
        category_counts: Dict[str, int] = {cat.value: 0 for cat in FraudCategory}
        for alert in all_alerts:
            category_counts[alert.category] = category_counts.get(alert.category, 0) + 1

        # Heuristic Anomaly Score (0 - 100)
        # Weights: HIGH = 30 pts, MEDIUM = 15 pts, LOW = 5 pts
        raw_score = 0.0
        for alert in all_alerts:
            if alert.severity == FraudSeverity.HIGH.value:
                raw_score += 30.0
            elif alert.severity == FraudSeverity.MEDIUM.value:
                raw_score += 15.0
            else:
                raw_score += 5.0

        anomaly_score = min(100.0, round(raw_score, 1))

        # Overall Status
        if total_analyzed < 3:
            overall_status = OverallStatus.INSUFFICIENT_DATA.value
            summary_notes = (
                f"Analyzed {total_analyzed} transaction(s). A comprehensive integrity assessment "
                f"requires at least 3 transaction records."
            )
        elif len(all_alerts) == 0:
            overall_status = OverallStatus.CLEAR.value
            summary_notes = (
                f"All {total_analyzed} transaction records passed automated integrity checks. "
                f"No duplicate UTRs, artificial cash recycling, or suspicious variance detected."
            )
        else:
            # Check if alerts are only low severity non-income/self-transfers
            has_high_or_med = any(a.severity in (FraudSeverity.HIGH.value, FraudSeverity.MEDIUM.value) for a in all_alerts)
            if has_high_or_med:
                overall_status = OverallStatus.REVIEW_RECOMMENDED.value
                summary_notes = (
                    f"Integrity review recommended: {len(all_alerts)} alert(s) across {len(flagged_indices)} "
                    f"flagged transaction(s). Review highlighted items before final credit scoring."
                )
            else:
                overall_status = OverallStatus.CLEAR.value
                summary_notes = (
                    f"{len(all_alerts)} informational notice(s) identified (e.g. self-transfers or refunds). "
                    f"Overall statement integrity is in good standing."
                )

        return IntegrityReportData(
            overall_status=overall_status,
            total_analyzed=total_analyzed,
            flagged_count=len(flagged_indices),
            anomaly_score=anomaly_score,
            category_counts=category_counts,
            alerts=all_alerts,
            summary_notes=summary_notes
        )

