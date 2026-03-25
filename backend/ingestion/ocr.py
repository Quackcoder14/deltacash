"""
DeltaCash – OCR Ingestion
Tries easyocr first; falls back to regex-based extraction.
Performs fuzzy matching against mock bank statement to detect duplicates.
"""
from __future__ import annotations

import io
import re
from datetime import date
from pathlib import Path
from typing import Optional, Tuple

from models.schemas import OCRResult

# ─── Fuzzy matching ──────────────────────────────────────────────────────────
try:
    from fuzzywuzzy import fuzz, process
    FUZZY_AVAILABLE = True
except ImportError:
    FUZZY_AVAILABLE = False

# ─── EasyOCR (optional) ──────────────────────────────────────────────────────
try:
    import easyocr
    _reader = easyocr.Reader(["en"], verbose=False)
    EASYOCR_AVAILABLE = True
except Exception:
    _reader = None
    EASYOCR_AVAILABLE = False

BANK_STATEMENT_PATH = Path(__file__).parent.parent / "data" / "mock_bank_statement.csv"


# ─── Public API ──────────────────────────────────────────────────────────────

def process_image(image_bytes: bytes) -> OCRResult:
    """
    Extract Vendor, Total, Date from an uploaded image.
    Falls back to regex if easyocr is not available.
    """
    raw_text = ""
    method = "regex"

    if EASYOCR_AVAILABLE and _reader:
        try:
            results = _reader.readtext(image_bytes, detail=0)
            raw_text = " ".join(results)
            method = "easyocr"
        except Exception:
            raw_text = _decode_bytes_as_text(image_bytes)
    else:
        raw_text = _decode_bytes_as_text(image_bytes)

    vendor, total, extracted_date = _extract_fields(raw_text)
    confidence = _estimate_confidence(vendor, total, extracted_date)
    duplicate_match, is_duplicate = _check_duplicate(vendor, total, extracted_date)

    return OCRResult(
        vendor=vendor,
        total=total,
        date=extracted_date,
        raw_text=raw_text[:500],
        confidence=confidence,
        duplicate_match=duplicate_match,
        is_duplicate=is_duplicate,
        extraction_method=method,
    )


def process_text(text: str) -> OCRResult:
    """
    For manual text input fallback — directly parse text.
    """
    vendor, total, extracted_date = _extract_fields(text)
    confidence = _estimate_confidence(vendor, total, extracted_date)
    duplicate_match, is_duplicate = _check_duplicate(vendor, total, extracted_date)

    return OCRResult(
        vendor=vendor,
        total=total,
        date=extracted_date,
        raw_text=text[:500],
        confidence=confidence,
        duplicate_match=duplicate_match,
        is_duplicate=is_duplicate,
        extraction_method="manual_text",
    )


# ─── Extraction helpers ──────────────────────────────────────────────────────

def _decode_bytes_as_text(image_bytes: bytes) -> str:
    """Try to decode bytes as UTF-8 text (for PDF/text mock uploads)."""
    try:
        return image_bytes.decode("utf-8", errors="ignore")
    except Exception:
        return ""


def _extract_fields(text: str) -> Tuple[Optional[str], Optional[float], Optional[date]]:
    vendor = _extract_vendor(text)
    total = _extract_total(text)
    extracted_date = _extract_date(text)
    return vendor, total, extracted_date


def _extract_vendor(text: str) -> Optional[str]:
    """
    Regex patterns for common invoice vendor formats.
    Looks for: 'From:', 'Vendor:', 'Billed by:', or ALLCAPS lines.
    """
    patterns = [
        r"(?:from|vendor|billed\s+by|bill\s+from|supplier)[:\s]+([A-Za-z][A-Za-z\s&.,']+?)(?:\n|,|\.|Ltd|Pvt|Inc|LLC)",
        r"(?:invoice\s+from)[:\s]+([A-Za-z][A-Za-z\s&.,']+)",
        r"^([A-Z][A-Z\s&.,']{3,30}(?:Ltd|PVT|LLC|Inc|Corp)\.?)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        if match:
            return match.group(1).strip()

    # Fallback: first line that looks like a company name
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    for line in lines[:5]:
        if len(line) > 3 and re.match(r"^[A-Za-z][A-Za-z\s&.,']+$", line):
            return line
    return None


def _extract_total(text: str) -> Optional[float]:
    """
    Extract the total/grand total amount.
    Handles: ₹, Rs., INR, USD, $, etc.
    """
    patterns = [
        r"(?:grand\s+total|total\s+amount|total\s+due|amount\s+due|total)[:\s]*[₹$Rs.INR\s]*([0-9,]+(?:\.[0-9]{1,2})?)",
        r"(?:total)[:\s]*[₹$Rs.INR\s]*([0-9,]+(?:\.[0-9]{1,2})?)",
        r"[₹$]\s*([0-9,]+(?:\.[0-9]{1,2})?)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            amount_str = match.group(1).replace(",", "")
            try:
                return float(amount_str)
            except ValueError:
                continue
    return None


def _extract_date(text: str) -> Optional[date]:
    """Extract dates in common formats: DD/MM/YYYY, YYYY-MM-DD, DD Mon YYYY."""
    patterns = [
        (r"(\d{1,2})[/-](\d{1,2})[/-](\d{4})", "%d/%m/%Y"),
        (r"(\d{4})[/-](\d{1,2})[/-](\d{1,2})", "%Y/%m/%d"),
        (r"(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})", None),
    ]
    for pattern, fmt in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                if fmt:
                    # Normalise separators
                    raw = re.sub(r"[/-]", "/", match.group(0))
                    if fmt == "%Y/%m/%d":
                        parts = raw.split("/")
                        return date(int(parts[0]), int(parts[1]), int(parts[2]))
                    else:
                        parts = raw.split("/")
                        return date(int(parts[2]), int(parts[1]), int(parts[0]))
                else:
                    months = {
                        "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
                        "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
                    }
                    day = int(match.group(1))
                    month = months.get(match.group(2).lower()[:3], 1)
                    year = int(match.group(3))
                    return date(year, month, day)
            except (ValueError, IndexError):
                continue
    return None


def _estimate_confidence(vendor, total, extracted_date) -> float:
    """Simple heuristic confidence score."""
    score = 0.0
    if vendor:
        score += 0.35
    if total:
        score += 0.45
    if extracted_date:
        score += 0.20
    return round(score, 2)


# ─── Duplicate Detection ─────────────────────────────────────────────────────

def _check_duplicate(
    vendor: Optional[str],
    total: Optional[float],
    extracted_date: Optional[date],
) -> Tuple[Optional[str], bool]:
    """
    Fuzzy-match the extracted vendor + amount against the mock bank statement.
    Returns (matching_entry_description, is_duplicate).
    """
    if not BANK_STATEMENT_PATH.exists():
        return None, False

    try:
        import csv
        with open(BANK_STATEMENT_PATH, "r") as f:
            reader = csv.DictReader(f)
            rows = list(reader)
    except Exception:
        return None, False

    if not vendor and not total:
        return None, False

    for row in rows:
        row_vendor = row.get("vendor", "")
        row_amount = float(row.get("amount", 0) or 0)
        row_desc = row.get("description", "")

        # Fuzzy vendor match
        vendor_match = (
            fuzz.partial_ratio(vendor.lower(), row_vendor.lower()) > 80
            if FUZZY_AVAILABLE and vendor and row_vendor
            else (vendor or "").lower() in (row_vendor or "").lower()
        )

        # Amount match (within 1%)
        amount_match = (
            abs(row_amount - (total or 0)) / max(row_amount, 1) < 0.01
            if total and row_amount > 0
            else False
        )

        if vendor_match and amount_match:
            return row_desc or row_vendor, True

    return None, False
