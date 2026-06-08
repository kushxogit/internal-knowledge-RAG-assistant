import re
from pathlib import Path
from typing import List
from .base import BaseParser
from ..schemas import ParsedTextElement

class MarkdownParser(BaseParser):
    """
    Parses Markdown files into structural elements.
    Identifies ATX headings (# Heading) and treats everything else as paragraphs.
    """
    
    def parse(self, file_path: Path) -> List[ParsedTextElement]:
        content = file_path.read_text(encoding='utf-8')
        elements: List[ParsedTextElement] = []
        
        current_paragraph: List[str] = []
        
        def _flush_paragraph():
            if current_paragraph:
                text = "\n".join(current_paragraph).strip()
                if text:
                    elements.append(ParsedTextElement(text=text, element_type="paragraph"))
                current_paragraph.clear()
        
        for line in content.splitlines():
            stripped_line = line.strip()
            
            # Check for ATX-style headers (# H1, ## H2, etc.)
            header_match = re.match(r'^(#{1,6})\s+(.+)$', stripped_line)
            
            if header_match:
                # Flush any accumulated paragraph text before the heading
                _flush_paragraph()
                
                level = len(header_match.group(1))
                text = header_match.group(2).strip()
                elements.append(
                    ParsedTextElement(
                        text=text,
                        element_type=f"h{level}"
                    )
                )
            elif not stripped_line:
                # Blank line means the end of a paragraph
                _flush_paragraph()
            else:
                # Accumulate paragraph lines
                current_paragraph.append(stripped_line)
                
        # Flush any remaining paragraph text at the end of the document
        _flush_paragraph()
                
        return elements
