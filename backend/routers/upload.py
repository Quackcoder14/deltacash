from fastapi import APIRouter, File, UploadFile
from ingestion.ocr import process_image, process_text

router = APIRouter(prefix="/upload", tags=["OCR"])

@router.post("/")
async def upload_invoice(file: UploadFile = File(...)):
    """Upload an image/pdf for OCR parsing."""
    content = await file.read()
    if file.filename.endswith(".txt"):
        return process_text(content.decode("utf-8"))
    
    return process_image(content)
