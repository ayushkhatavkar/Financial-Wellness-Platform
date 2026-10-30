from enum import Enum
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class FraudSeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"

class ReviewStatus(str, Enum):
    PENDING_REVIEW = "PENDING_REVIEW"
    CONFIRMED_INVALID = "CONFIRMED_INVALID"
    CLEARED = "CLEARED"

class OverallStatus(str, Enum):
    CLEAR = "CLEAR"
    REVIEW_RECOMMENDED = "REVIEW_RECOMMENDED"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"

class FraudCategory(str, Enum):
    DUPLICATE = "DUPLICATE"
    CIRCULAR_TRANSFER = "CIRCULAR_TRANSFER"
    INCOME_SPIKE = "INCOME_SPIKE"
    SELF_TRANSFER = "SELF_TRANSFER"
    SUSPICIOUS_REPETITION = "SUSPICIOUS_REPETITION"

def mask_reference_id(ref: Optional[str]) -> str:
    """Mask a bank UTR / reference id for explainability and privacy (e.g. 234567890123 -> ******0123)."""
    if not ref:
        return "N/A"
    ref_str = str(ref).strip()
    if ref_str.startswith("CSV-"):
        return "Internal-Row"
    if len(ref_str) <= 4:
        return "***" + ref_str[-2:] if len(ref_str) > 2 else "****"
    return "*" * (len(ref_str) - 4) + ref_str[-4:]

def mask_counterparty(name: Optional[str]) -> str:
    """Mask counterparty personal identifier for privacy (e.g. ramesh@okaxis -> r****h@okaxis)."""
    if not name:
        return "Unknown"
    s = str(name).strip()
    if "@" in s:
        user_part, domain = s.split("@", 1)
        if len(user_part) > 2:
            masked_user = user_part[0] + "*" * (len(user_part) - 2) + user_part[-1]
        else:
            masked_user = user_part[0] + "*"
        return f"{masked_user}@{domain}"
    parts = s.split()
    masked_parts = []
    for p in parts:
        if len(p) <= 2:
            masked_parts.append(p)
        else:
            masked_parts.append(p[0] + "*" * (len(p) - 2) + p[-1])
    return " ".join(masked_parts)

class FraudAlertItem(BaseModel):
    rule_id: str
    rule_name: str
    category: str
    severity: str = "MEDIUM"
    explanation: str
    evidence: Dict[str, Any] = Field(default_factory=dict)
    affected_indices: List[int] = Field(default_factory=list)
    external_ref: Optional[str] = None
    review_status: str = "PENDING_REVIEW"

class IntegrityReportData(BaseModel):
    overall_status: str
    total_analyzed: int
    flagged_count: int
    anomaly_score: float
    category_counts: Dict[str, int]
    alerts: List[FraudAlertItem] = Field(default_factory=list)
    summary_notes: str

