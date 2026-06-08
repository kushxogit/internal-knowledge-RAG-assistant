import re
from pathlib import Path
from typing import List
from .base import BaseParser
from ..schemas import ParsedElement

class MarkdownParser(BaseParser):
    """
    Parses Markdown files into structural elements.
    Identifies ATX headings (# Heading) and treats everything else as paragraphs.
    """
    
    def parse(self, file_path: Path) -> List[ParsedElement]:
        content = file_path.read_text(encoding='utf-8')
        
        elements: List[ParsedElement] = []
        
        # Simple regex to split by blocks (double newline)
        blocks = re.split(r'\n\s*\n', content)
        
        for block in blocks:
            block = block.strip()
            if not block:
                continue
                
            # Check for ATX-style headers (# H1, ## H2, etc.)
            header_match = re.match(r'^(#{1,6})\s+(.+)$', block, flags=re.MULTILINE)
            
            if header_match:
                level = len(header_match.group(1))
                text = header_match.group(2).strip()
                elements.append(
                    ParsedElement(
                        text=text,
                        element_type=f"h{level}",
                    )
                )
            else:
                # Treat as a paragraph block
                elements.append(
                    ParsedElement(
                        text=block,
                        element_type="paragraph",
                    )
                )
                
        return elements
