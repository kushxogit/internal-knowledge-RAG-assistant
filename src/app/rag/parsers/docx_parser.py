import docx
from pathlib import Path
from typing import List
from .base import BaseParser
from ..schemas import ParsedElement

class DocxParser(BaseParser):
    """
    Parses Word (.docx) files using python-docx.
    Extracts headings based on paragraph styles.
    """
    
    def parse(self, file_path: Path) -> List[ParsedElement]:
        doc = docx.Document(file_path)
        elements: List[ParsedElement] = []
        
        for paragraph in doc.paragraphs:
            text = paragraph.text.strip()
            if not text:
                continue
                
            style_name = paragraph.style.name.lower()
            
            # Map Word heading styles to our schema (Heading 1 -> h1)
            if style_name.startswith('heading'):
                try:
                    level = int(style_name.split()[-1])
                    element_type = f"h{level}"
                except ValueError:
                    element_type = "h1" # Fallback if style is just "Heading"
            elif style_name == 'title':
                element_type = "title"
            else:
                element_type = "paragraph"
                
            elements.append(
                ParsedElement(
                    text=text,
                    element_type=element_type
                )
            )
            
        return elements
