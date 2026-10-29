import csv
import io
import re
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime, date
from decimal import Decimal

# Column header alias mappings for Indian statement formats (PhonePe, Paytm, Google Pay, generic bank CSVs)
HEADER_ALIASES = {
    "date": [
        "date", "txn date", "transaction date", "transactiondate", 
        "payment date", "value date", "posting date", "trans date", "txndate"
    ],
    "time": [
        "time", "transaction time", "txntime", "transactiontime", "time of txn"
    ],
    "description": [
        "transaction details", "description", "details", "particulars", 
        "remarks", "narration", "transaction description", "notes", "merchant name", "payee name"
    ],
    "ref_id": [
        "transaction id", "txn id", "transactionid", "reference no", 
        "reference id", "ref no", "utr", "journal no", "order id", "rrn", 
        "cheque no", "ref id", "trans id", "external id"
    ],
    "amount": [
        "amount", "txn amount", "transaction amount", "transactionamount", 
        "amount (inr)", "total amount", "net amount", "amt", "transaction amt"
    ],
    "debit": [
        "debit", "withdrawal", "dr", "dr.", "debit amount", "withdrawal amount", 
        "withdrawals", "debit (inr)", "withdrawal (inr)", "withdrawal amount (inr)"
    ],
    "credit": [
        "credit", "deposit", "cr", "cr.", "credit amount", "deposit amount", 
        "deposits", "credit (inr)", "deposit (inr)", "deposit amount (inr)"
    ],
    "type": [
        "transaction type", "type", "cr/dr", "credit/debit", "txn type", 
        "dr/cr", "cr / dr", "dr / cr", "tran type"
    ],
    "counterparty": [
        "counterparty", "paid to", "received from", "sender/receiver", 
        "merchant", "beneficiary", "payee", "remitter", "credit/debit instrument", "instrument"
    ],
    "balance": [
        "balance", "available balance", "closing balance", "ledger balance", 
        "account balance", "balance (inr)", "current balance"
    ],
    "status": [
        "status", "txn status", "transaction status", "payment status"
    ]
}

def normalize_header(h: str) -> str:
    """Normalize header string for fuzzy alias matching."""
    cleaned = re.sub(r'[^a-zA-Z0-9\s/]', ' ', h)
    return ' '.join(cleaned.strip().lower().split())

def detect_column_mapping(headers: List[str]) -> Dict[str, str]:
    """Map detected raw CSV headers to standard canonical fields."""
    mapping: Dict[str, str] = {}
    normalized = {normalize_header(h): h for h in headers if h and h.strip()}

    for canonical, aliases in HEADER_ALIASES.items():
        for alias in aliases:
            norm_alias = normalize_header(alias)
            if norm_alias in normalized:
                mapping[canonical] = normalized[norm_alias]
                break

    return mapping

def find_header_row(rows: List[List[str]]) -> Tuple[int, Dict[str, str]]:
    """
    Scans the beginning of a CSV for the actual table header row,
    skipping statement preambles, titles, duration, or blank metadata rows.
    """
    for idx, row in enumerate(rows[:25]):
        if not row or not any(cell.strip() for cell in row):
            continue
        mapping = detect_column_mapping(row)
        # Check if row has date AND (amount OR (debit AND/OR credit))
        has_date = "date" in mapping
        has_amount = "amount" in mapping or "debit" in mapping or "credit" in mapping
        if has_date and has_amount:
            return idx, mapping

    return -1, {}

def parse_date_string(date_raw: str) -> Optional[date]:
    """Robust parser for common Indian and international banking date strings."""
    if not date_raw:
        return None
    cleaned = date_raw.strip().split()[0].replace(',', '')
    formats = (
        "%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y",
        "%d-%b-%Y", "%d %b %Y", "%d %B %Y", "%b %d %Y",
        "%Y/%m/%d", "%Y.%m.%d", "%d.%m.%Y"
    )
    for fmt in formats:
        try:
            return datetime.strptime(cleaned, fmt).date()
        except Exception:
            pass
    return None

def parse_amount_value(val_str: Any) -> Optional[Decimal]:
    """Parse monetary amount string into Decimal, handling currency symbols, commas, and parentheses."""
    if val_str is None:
        return None
    s = str(val_str).strip()
    if not s or s in ("-", "--", "NA", "N/A", "nil", "null"):
        return None
    # Strip symbols
    s = s.replace(",", "").replace("₹", "").replace("Rs.", "").replace("Rs", "").replace("INR", "").replace("$", "").strip()
    # Check parenthesized debit format: (1200.00) -> 1200.00
    if s.startswith("(") and s.endswith(")"):
        s = s[1:-1].strip()
    try:
        amt = abs(Decimal(s))
        return amt if amt > Decimal("0.00") else None
    except Exception:
        return None

def infer_category_and_flags(desc: str, txn_type: str) -> Tuple[str, bool, bool]:
    """
    Infer transaction category, refund flag, and scoring exclusion flag
    based on description keywords and transaction direction.
    """
    desc_lower = desc.lower().strip()
    is_refund = False
    is_excluded = False

    # 1. Refunds / Reversals
    if any(k in desc_lower for k in ("refund", "reversal", "chargeback", "reversed")):
        is_refund = True
        return "REFUND", is_refund, True

    # 2. Loan Proceeds & Disbursements (do not count as earned income)
    if any(k in desc_lower for k in ("loan disburs", "credit line", "loan credit", "sanction amount", "borrowing")):
        return "LOAN_PROCEEDS", False, True

    # 3. Internal transfers (self transfers)
    if any(k in desc_lower for k in ("self transfer", "own account", "to self", "from self", "internal transfer")):
        return "INTERNAL_TRANSFER", False, True

    # 4. Utilities and Mobile Recharge (use word boundary for short operators)
    if re.search(r'\b(recharge|airtel|jio|bsnl|bescom|electricity|water|gas|broadband|dth|utility)\b', desc_lower) or "vodafone" in desc_lower:
        return "UTILITIES", False, False

    # 5. Fuel & Transportation
    if any(k in desc_lower for k in ("petrol", "diesel", "fuel", "hpcl", "bpcl", "indian oil", "ioc", "cng", "toll", "fastag", "parking", "shell petrol", "redbus", "transport")):
        return "FUEL_TRANSPORT", False, False

    # 6. Food, Dining & Groceries
    if any(k in desc_lower for k in ("bistro", "mess", "caterer", "restaurant", "cafe", "dhaba", "food", "dining", "swiggy instamart", "blinkit", "zepto", "d-mart", "grocer", "canteen", "milk", "bakery", "pastries", "mcdonald", "idli", "bhojnalaya")):
        return "FOOD_GROCERIES", False, False

    # 7. Healthcare & Medical
    if any(k in desc_lower for k in ("pharmacy", "medical", "hospital", "clinic", "apollo", "1mg", "chemist", "diagnostic")):
        return "HEALTHCARE", False, False

    # 8. Business / Operational Expenses (direct tools, equipment, repairs, work services)
    if any(k in desc_lower for k in ("servicentre", "maintenance", "repair", "spares", "allied division", "stationery", "xerox", "vendor", "supplies", "business expense")):
        return "BUSINESS_EXPENSE", False, False

    # 9. Platform Gig Income
    if any(k in desc_lower for k in ("zomato", "swiggy", "uber", "ola", "zepto", "blinkit", "rapido", "payout", "trip earning", "delivery earning", "weekly payout", "gig earning")):
        return "GIG_INCOME", False, False

    # 10. Default category based on direction:
    # Peer / Personal UPI Credit -> OTHER_INCOME
    # Peer / Personal UPI Debit -> OTHER_EXPENSE
    if txn_type == "CREDIT":
        return "OTHER_INCOME", False, False
    else:
        return "OTHER_EXPENSE", False, False

def parse_csv_statement(
    file_bytes: bytes,
    filename: str
) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    """
    Parse uploaded statement CSV bytes with support for PhonePe, Paytm, Google Pay,
    and standard banking formats.
    
    Returns:
      (preview_dict, parsed_canonical_records)
    """
    # Attempt multiple decodings
    decoded: Optional[str] = None
    for enc in ("utf-8-sig", "utf-8", "latin1", "cp1252"):
        try:
            decoded = file_bytes.decode(enc)
            break
        except UnicodeDecodeError:
            continue

    if decoded is None:
        raise ValueError("Unable to decode statement file. Please provide a standard UTF-8 or ASCII CSV.")

    reader = csv.reader(io.StringIO(decoded))
    all_rows = [r for r in reader if any(field.strip() for field in r)]

    if len(all_rows) < 2:
        raise ValueError("File appears empty or missing a transaction header row.")

    # Locate the true table header row (skipping PhonePe/banking preambles)
    header_idx, mapping = find_header_row(all_rows)

    if header_idx == -1:
        # Check first non-empty row to provide helpful debug info in the error
        first_row_preview = ", ".join(all_rows[0][:5]) if all_rows else "empty"
        raise ValueError(
            f"Missing essential columns. Statement CSV must include at least Date and Amount columns "
            f"(or separate Debit and Credit columns). Detected first line: [{first_row_preview}]."
        )

    headers = [h.strip() for h in all_rows[header_idx]]
    data_rows = all_rows[header_idx + 1:]

    sample_rows: List[Dict[str, Any]] = []
    canonical_records: List[Dict[str, Any]] = []
    warning_count = 0

    for idx, row in enumerate(data_rows, start=1):
        # Ignore empty rows or obvious footer disclaimer lines (PhonePe disclaimer, confidentiality notice, URLs)
        row_joined = " ".join(row).lower()
        if any(foot in row_joined for foot in ("automatically generated", "terms & conditions", "privacy policy", "fictitious offers", "confidential and intended")):
            continue

        row_dict = {headers[i]: (row[i].strip() if i < len(row) else "") for i in range(len(headers))}

        # 1. Parse Date
        date_raw = row_dict.get(mapping.get("date", ""), "")
        parsed_date = parse_date_string(date_raw)
        if not parsed_date:
            warning_count += 1
            continue

        # 2. Determine Amount and Transaction Type
        amount: Optional[Decimal] = None
        txn_type: str = "DEBIT"

        has_separate_debit = "debit" in mapping
        has_separate_credit = "credit" in mapping

        if has_separate_debit or has_separate_credit:
            debit_val = parse_amount_value(row_dict.get(mapping.get("debit", ""), None)) if has_separate_debit else None
            credit_val = parse_amount_value(row_dict.get(mapping.get("credit", ""), None)) if has_separate_credit else None

            if credit_val is not None and credit_val > Decimal("0.00"):
                amount = credit_val
                txn_type = "CREDIT"
            elif debit_val is not None and debit_val > Decimal("0.00"):
                amount = debit_val
                txn_type = "DEBIT"
            elif "amount" in mapping:
                amount = parse_amount_value(row_dict.get(mapping.get("amount", ""), None))
        else:
            amount = parse_amount_value(row_dict.get(mapping.get("amount", ""), None))

        if amount is None or amount <= Decimal("0.00"):
            warning_count += 1
            continue

        # 3. Determine Type if not already determined by separate columns
        if not (has_separate_debit and has_separate_credit):
            type_raw = (row_dict.get(mapping.get("type", ""), "") or "").upper().strip()
            desc_raw = (row_dict.get(mapping.get("description", ""), "") or "").strip()

            if any(cr in type_raw for cr in ("CR", "CREDIT", "DEPOSIT", "RECEIVED", "INWARD")):
                txn_type = "CREDIT"
            elif any(dr in type_raw for dr in ("DR", "DEBIT", "WITHDRAWAL", "PAID", "OUTWARD", "SENT")):
                txn_type = "DEBIT"
            elif desc_raw.lower().startswith(("received from", "cashback from", "credited", "deposit")):
                txn_type = "CREDIT"
            elif desc_raw.lower().startswith(("paid to", "payment to", "debited", "withdrawal", "sent to")):
                txn_type = "DEBIT"
            else:
                txn_type = "DEBIT"

        # 4. Status Check (if available)
        status_val = "SUCCESS"
        if "status" in mapping:
            stat_raw = (row_dict.get(mapping.get("status", ""), "") or "").upper().strip()
            if any(f in stat_raw for f in ("FAIL", "DECLINED", "REJECT")):
                status_val = "FAILED"
            elif any(p in stat_raw for p in ("PENDING", "PROCESSING", "IN_PROGRESS")):
                status_val = "PENDING"

        # 5. Description, Reference ID, Counterparty
        description = row_dict.get(mapping.get("description", ""), "Statement Transaction")
        if not description or not description.strip():
            description = "Statement Transaction"

        # Reference ID: look for Transaction ID, UTR, or Ref ID
        ref_id = row_dict.get(mapping.get("ref_id", ""), "")
        if not ref_id:
            # Fall back to UTR if separate
            utr_key = mapping.get("utr") or "UTR"
            ref_id = row_dict.get(utr_key, "")
        if not ref_id:
            ref_id = f"CSV-{idx}-{int(datetime.utcnow().timestamp())}"

        # Counterparty
        counterparty = row_dict.get(mapping.get("counterparty", ""), "")
        if not counterparty:
            # Infer from description e.g. "Paid to BISTRO" -> "BISTRO"
            if description.lower().startswith("paid to "):
                counterparty = description[8:].strip()
            elif description.lower().startswith("received from "):
                counterparty = description[14:].strip()
            else:
                counterparty = "Self/Vendor"

        # 6. Category and exclusion flags
        category, is_refund, is_excluded = infer_category_and_flags(description, txn_type)

        canonical_records.append({
            "ref_id": str(ref_id).strip(),
            "transaction_date": parsed_date,
            "description": str(description).strip(),
            "amount": amount,
            "transaction_type": txn_type,
            "category": category,
            "payment_method": "UPI",
            "counterparty": str(counterparty).strip(),
            "status": status_val,
            "is_refund": is_refund,
            "is_excluded_from_scoring": is_excluded
        })

        if len(sample_rows) < 5:
            sample_rows.append(row_dict)

    if not canonical_records:
        raise ValueError("No valid transaction records found. Please check date and amount formats.")

    preview = {
        "filename": filename,
        "total_rows": len(canonical_records),
        "detected_columns": headers,
        "valid_rows": len(canonical_records),
        "warning_count": warning_count,
        "sample_rows": sample_rows
    }

    return preview, canonical_records
