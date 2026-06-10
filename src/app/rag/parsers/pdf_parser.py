import pdfplumber
import pypdfium2 as pdfium
import numpy as np
from PIL import Image
from pathlib import Path
from typing import List
from .base import BaseParser
from ..schemas import ParsedTextElement

# Lazy-load EasyOCR reader to avoid loading heavy models on boot
_ocr_reader = None

def get_ocr_reader():
    global _ocr_reader
    if _ocr_reader is None:
        import easyocr
        # Auto-detects GPU if available, else falls back to CPU
        _ocr_reader = easyocr.Reader(['en'])
    return _ocr_reader

class PdfParser(BaseParser):
    """
    Parses PDF files using pdfplumber.
    Currently extracts text block by block, treating all as paragraphs.
    Preserves page numbers.
    """
    
    def parse(self, file_path: Path) -> List[ParsedTextElement]:
        elements: List[ParsedTextElement] = []
        
        with pdfplumber.open(file_path) as pdf:
            pdfium_doc = None
            
            for page_num, page in enumerate(pdf.pages, start=1):
                text = page.extract_text() or ""
                
                # If standard extraction yields too little text, it's likely a scanned image
                if len(text.strip()) < 20:
                    if pdfium_doc is None:
                        pdfium_doc = pdfium.PdfDocument(str(file_path))
                    
                    # pypdfium2 is 0-indexed
                    pdfium_page = pdfium_doc[page_num - 1]
                    # Render page at high resolution (scale=2.0 is ~144 DPI)
                    bitmap = pdfium_page.render(scale=2.0)
                    pil_image = bitmap.to_pil()
                    image_np = np.array(pil_image)
                    
                    reader = get_ocr_reader()
                    # detail=0 returns a list of raw text strings
                    ocr_results = reader.readtext(image_np, detail=0)
                    text = "\n\n".join(ocr_results)
                    
                if not text.strip():
                    continue
                    
                # A basic heuristic: split by double newlines
                blocks = text.split('\n\n')
                
                for block in blocks:
                    block = block.strip()
                    if not block:
                        continue
                        
                    # We might clean up single newlines inside a block that are just line-wraps
                    block = block.replace('\n', ' ')
                    
                    # For now, treat all PDF blocks as paragraphs
                    # A more advanced version could check font size to detect h1/h2
                    elements.append(
                        ParsedTextElement(
                            text=block,
                            element_type="paragraph",
                            page_number=page_num
                        )
                    )
            
            if pdfium_doc is not None:
                pdfium_doc.close()
                    
        return elements
