import pdfplumber
from pathlib import Path
from typing import List
from .base import BaseParser
from ..schemas import ParsedTextElement

class PdfParser(BaseParser):
    """
    Parses PDF files using pdfplumber.
    Currently extracts text block by block, treating all as paragraphs.
    Preserves page numbers.
    """
    
    def parse(self, file_path: Path) -> List[ParsedTextElement]:
        elements: List[ParsedTextElement] = []
        
        with pdfplumber.open(file_path) as pdf:
            for page_num, page in enumerate(pdf.pages, start=1):
                # Extract words/blocks can be tricky.
                # extract_text() gets the whole page as a string.
                # We can split by double newlines to simulate paragraphs.
                text = page.extract_text()
                if not text:
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
                    
        return elements
