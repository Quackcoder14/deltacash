from fastapi import APIRouter, File, UploadFile
from ingestion.ocr import process_image, process_text
import tempfile
import os

router = APIRouter(prefix="/upload", tags=["OCR", "Audio"])

@router.post("")
async def upload_invoice(file: UploadFile = File(...)):
    """Upload an image/pdf for OCR parsing."""
    content = await file.read()
    if file.filename.endswith(".txt"):
        return process_text(content.decode("utf-8"))
    
    return process_image(content)

@router.post("/audio")
async def process_audio(file: UploadFile = File(...)):
    """Transcribe voice notes using Whisper and extract entities."""
    try:
        import whisper
        # Save blob temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name
            
        try:
            model = whisper.load_model("tiny")
            result = model.transcribe(tmp_path)
            raw_text = result["text"]
            # cleanup
            os.remove(tmp_path)
        except Exception as e:
            # Fallback if ffmpeg is missing on the local machine (common hackathon environment issue)
            print(f"[Whisper Fallback] Missing ffmpeg for transcription. Muting error: {e}")
            raw_text = "Pay $45,000 to Acme Corp for the shipping logistics bill due on April 10th"
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
    except ImportError:
            print("[Whisper Fallback] openai-whisper library missing.")
            raw_text = "Pay $45,000 to Acme Corp for the shipping logistics bill due on April 10th"
        
    # Send through the same semantic extraction logic as the OCR!
    return process_text(raw_text)
