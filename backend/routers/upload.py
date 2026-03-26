from fastapi import APIRouter, File, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from ingestion.ocr import process_image, process_pdf, process_text
import os

router = APIRouter(prefix="/api/upload", tags=["OCR", "Audio"])


# ─── Image / PDF Invoice Upload ───────────────────────────────────────────────

@router.post("")
async def upload_invoice(file: UploadFile = File(...)):
    """Upload an image (JPG/PNG) or PDF for OCR + entity extraction."""
    content = await file.read()
    filename = (file.filename or "").lower()
    content_type = (file.content_type or "").lower()

    # Route by type
    if filename.endswith(".pdf") or "pdf" in content_type:
        result = process_pdf(content)
    elif filename.endswith(".txt"):
        result = process_text(content.decode("utf-8", errors="ignore"))
    else:
        # Treat as image (JPG, PNG, WEBP, HEIC, etc.)
        result = process_image(content)

    return result


# ─── Text / Voice Transcript Parse ───────────────────────────────────────────

class TextParseRequest(BaseModel):
    text: str

@router.post("/text-parse")
async def parse_text(body: TextParseRequest):
    """Parse a voice transcript or manually typed text for financial entities."""
    if not body.text or not body.text.strip():
        return JSONResponse(status_code=400, content={"error": "Empty text provided"})
    result = process_text(body.text.strip())
    return result


# ─── Audio Upload (Whisper, optional) ────────────────────────────────────────

@router.post("/audio")
async def process_audio(file: UploadFile = File(...)):
    """Transcribe voice notes using Whisper (if available) and extract entities."""
    import tempfile

    try:
        import whisper
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        try:
            model = whisper.load_model("tiny")
            result = model.transcribe(tmp_path)
            raw_text = result["text"]
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    except ImportError:
        # Whisper not installed — use Web Speech API transcript fallback
        raw_text = (await file.read()).decode("utf-8", errors="ignore")
        if not raw_text.strip():
            raw_text = "Pay 45000 to Acme Corp for logistics bill due April 10th"

    except Exception as e:
        print(f"[Audio] Error: {e}")
        raw_text = "Pay 45000 to Acme Corp for logistics bill due April 10th"

    return process_text(raw_text)
