"""
DeltaCash – OCR Ingestion Engine (v2)
Extraction priority:
  Images → easyocr → pytesseract → PIL text
  PDFs   → pdfplumber (text layer) → pytesseract per-page
  Text   → regex entity extraction directly

Performs fuzzy matching against mock bank statement to detect duplicates.
"""
from __future__ import annotations

import io
import re
from datetime import date
from pathlib import Path
from typing import Optional, Tuple

from models.schemas import OCRResult

# ─── Optional heavy deps ─────────────────────────────────────────────────────

try:
    from fuzzywuzzy import fuzz
    FUZZY_AVAILABLE = True
except ImportError:
    FUZZY_AVAILABLE = False

try:
    import easyocr
    _reader = easyocr.Reader(["en"], verbose=False)
    EASYOCR_AVAILABLE = True
except Exception:
    _reader = None
    EASYOCR_AVAILABLE = False

try:
    import pytesseract
    from PIL import Image
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False

try:
    import pdfplumber
    PDFPLUMBER_AVAILABLE = True
except ImportError:
    PDFPLUMBER_AVAILABLE = False

BANK_STATEMENT_PATH = Path(__file__).parent.parent / "data" / "mock_bank_statement.csv"


# ─── Public API ──────────────────────────────────────────────────────────────

def process_image(image_bytes: bytes) -> OCRResult:
    """
    Extract Vendor, Total, Date from an uploaded image.
    Priority: EasyOCR → pytesseract → raw bytes decode.
    """
    raw_text = ""
    method = "regex_fallback"

    if EASYOCR_AVAILABLE and _reader:
        try:
            results = _reader.readtext(image_bytes, detail=0)
            raw_text = " ".join(results)
            method = "easyocr"
        except Exception:
            pass

    if not raw_text and TESSERACT_AVAILABLE:
        try:
            pil_img = Image.open(io.BytesIO(image_bytes))
            raw_text = pytesseract.image_to_string(pil_img)
            method = "pytesseract"
        except Exception:
            pass

    if not raw_text:
        raw_text = _decode_bytes_as_text(image_bytes)

    return _build_result(raw_text, method)


def process_pdf(pdf_bytes: bytes) -> OCRResult:
    """
    Extract text from a PDF using pdfplumber (respects text layer).
    Falls back to pytesseract on rendered page images if no text found.
    """
    raw_text = ""
    method = "pdfplumber"

    if PDFPLUMBER_AVAILABLE:
        try:
            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                pages_text = []
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        pages_text.append(text)
                raw_text = "\n".join(pages_text)
        except Exception as e:
            print(f"[pdfplumber] Error: {e}")

    # If pdfplumber found no text (scanned PDF), try pytesseract on first page
    if not raw_text and PDFPLUMBER_AVAILABLE and TESSERACT_AVAILABLE:
        try:
            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                if pdf.pages:
                    img = pdf.pages[0].to_image(resolution=200).original
                    raw_text = pytesseract.image_to_string(img)
                    method = "pdfplumber+pytesseract"
        except Exception as e:
            print(f"[pdfplumber+ocr] Error: {e}")

    if not raw_text:
        raw_text = _decode_bytes_as_text(pdf_bytes)
        method = "text_decode"

    return _build_result(raw_text, method)


def process_text(text: str) -> OCRResult:
    """
    For manual text input / voice transcripts — directly parse text.
    """
    return _build_result(text, "text_input")


# ─── Core builder ────────────────────────────────────────────────────────────

def _build_result(raw_text: str, method: str) -> OCRResult:
    vendor, total, extracted_date = _extract_fields(raw_text)
    confidence = _estimate_confidence(vendor, total, extracted_date)
    duplicate_match, is_duplicate = _check_duplicate(vendor, total, extracted_date)

    return OCRResult(
        vendor=vendor,
        total=total,
        date=extracted_date,
        raw_text=raw_text[:600],
        confidence=confidence,
        duplicate_match=duplicate_match,
        is_duplicate=is_duplicate,
        extraction_method=method,
    )


# ─── Extraction helpers ──────────────────────────────────────────────────────

def _decode_bytes_as_text(image_bytes: bytes) -> str:
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
    Multi-pattern vendor extraction for Indian/global invoices.
    """
    patterns = [
        # Explicit labels
        r"(?:from|vendor|billed\s+by|bill\s+from|supplier|sold\s+by|party)[:\s]+([A-Za-z][A-Za-z0-9\s\&\.\,\']+?)(?:\n|,|\.|Ltd|Pvt|Inc|LLC|LLP)",
        r"(?:invoice\s+from|pay\s+to|payable\s+to)[:\s]+([A-Za-z][A-Za-z0-9\s\&\.\,\']+)",
        # Company suffix on first occurrence
        r"([A-Z][A-Za-z0-9\s\&\.\']{2,40}(?:Ltd|PVT|LLC|Inc|Corp|LLP|Co)\.?)",
        # GSTIN associated line: "M/s XYZ" / "M/S XYZ"
        r"(?:M\/[Ss]\.?\s+)([A-Za-z][A-Za-z0-9\s\&\.\']{2,40})",
        # Voice transcript patterns: "pay X to COMPANY for..."
        r"(?:pay\s+[\w\s,]+\s+to\s+)([A-Za-z][A-Za-z\s]{2,30})(?:\s+for|\s+due|\s+by|$)",
        r"(?:payment\s+to\s+)([A-Za-z][A-Za-z\s]{2,30})",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        if match:
            candidate = match.group(1).strip().rstrip(",.")
            if len(candidate) > 2:
                return candidate

    # Fallback: first clean-looking line
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    for line in lines[:6]:
        if 3 < len(line) < 60 and re.match(r"^[A-Za-z][A-Za-z0-9\s\&\.\']+$", line):
            return line
    return None


def _extract_total(text: str) -> Optional[float]:
    """
    Extract the total/grand-total amount.
    Handles: ₹, Rs., INR, USD, $, voice (word numbers, bare numbers in context)
    """
    patterns = [
        r"(?:grand\s+total|total\s+amount|total\s+due|amount\s+due|net\s+payable|amount\s+payable)[:\s]*[₹\$Rs.INR\s]*([0-9,]+(?:\.[0-9]{1,2})?)",
        r"(?:total)[:\s]*[₹\$Rs.INR\s]*([0-9,]+(?:\.[0-9]{1,2})?)",
        r"[₹\$]\s*([0-9,]+(?:\.[0-9]{1,2})?)",
        r"(?:Rs\.?|INR)\s*([0-9,]+(?:\.[0-9]{1,2})?)",
        # Voice: "45000 rupees" / "rupees 45000"
        r"([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:rupees?|INR|Rs\.?)",
        # Voice: "pay 50000 to..." or "amount 50000"
        r"(?:pay|paid|amount|worth|of)\s+([0-9,]{4,}(?:\.[0-9]{1,2})?)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            amount_str = match.group(1).replace(",", "")
            try:
                val = float(amount_str)
                if val > 0:
                    return val
            except ValueError:
                continue

    # Voice: word-numbers "fifty thousand", "ten lakh"
    word_num = _parse_word_number(text.lower())
    if word_num and word_num > 0:
        return float(word_num)

    return None



def _parse_word_number(text: str) -> Optional[int]:
    """Convert spoken number words to integer (handles lakh/crore too)."""
    ones = {"zero":0,"one":1,"two":2,"three":3,"four":4,"five":5,"six":6,"seven":7,"eight":8,"nine":9,
            "ten":10,"eleven":11,"twelve":12,"thirteen":13,"fourteen":14,"fifteen":15,"sixteen":16,
            "seventeen":17,"eighteen":18,"nineteen":19}
    tens = {"twenty":20,"thirty":30,"forty":40,"fifty":50,"sixty":60,"seventy":70,"eighty":80,"ninety":90}
    multipliers = {"hundred":100,"thousand":1000,"lakh":100000,"lakhs":100000,"crore":10000000,"crores":10000000}

    words = re.findall(r"[a-z]+", text)
    total = 0
    current = 0
    for word in words:
        if word in ones:
            current += ones[word]
        elif word in tens:
            current += tens[word]
        elif word in multipliers:
            mult = multipliers[word]
            if current == 0:
                current = 1
            if mult >= 1000:
                total += current * mult
                current = 0
            else:
                current *= mult
    total += current
    return total if total > 0 else None


def _extract_date(text: str) -> Optional[date]:
    """Extract dates in common formats."""
    patterns = [
        (r"(\d{1,2})[/-](\d{1,2})[/-](\d{4})", "dmy"),
        (r"(\d{4})[/-](\d{1,2})[/-](\d{1,2})", "ymd"),
        (r"(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})", "dmonthy"),
        # Voice: "april 20th", "20th april 2025"
        (r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})", "monthdY"),
        (r"(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*", "dm_no_year"),
    ]
    months = {"jan":1,"feb":2,"mar":3,"apr":4,"may":5,"jun":6,"jul":7,"aug":8,"sep":9,"oct":10,"nov":11,"dec":12}
    current_year = 2025

    for pattern, fmt in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if not match:
            continue
        try:
            if fmt == "dmy":
                d, m, y = int(match.group(1)), int(match.group(2)), int(match.group(3))
                return date(y, m, d)
            elif fmt == "ymd":
                y, m, d = int(match.group(1)), int(match.group(2)), int(match.group(3))
                return date(y, m, d)
            elif fmt == "dmonthy":
                d = int(match.group(1))
                m = months.get(match.group(2).lower()[:3], 1)
                y = int(match.group(3))
                return date(y, m, d)
            elif fmt == "monthdY":
                m = months.get(match.group(1).lower()[:3], 1)
                d = int(match.group(2))
                y = int(match.group(3))
                return date(y, m, d)
            elif fmt == "dm_no_year":
                d = int(match.group(1))
                m = months.get(match.group(2).lower()[:3], 1)
                return date(current_year, m, d)
        except (ValueError, IndexError):
            continue
    return None


def _estimate_confidence(vendor, total, extracted_date) -> float:
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

        vendor_match = (
            fuzz.partial_ratio(vendor.lower(), row_vendor.lower()) > 80
            if FUZZY_AVAILABLE and vendor and row_vendor
            else (vendor or "").lower() in (row_vendor or "").lower()
        )

        amount_match = (
            abs(row_amount - (total or 0)) / max(row_amount, 1) < 0.01
            if total and row_amount > 0
            else False
        )

        if vendor_match and amount_match:
            return row_desc or row_vendor, True

    return None, False
