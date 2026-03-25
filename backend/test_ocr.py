import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

try:
    import easyocr
    reader = easyocr.Reader(['en'])
    print("EasyOCR successfully initialized.")
except Exception as e:
    print(f"Error initializing EasyOCR: {e}")
