from dataclasses import dataclass, field
from typing import Optional

@dataclass
class ParsedTextElement:
    """
    Represents a single structural element extracted from a document.
    """
    text: str
    element_type: str  # e.g., "title", "h1", "h2", "h3", "paragraph", "list_item", "table"
    page_number: Optional[int] = None
    metadata: dict = field(default_factory=dict)

@dataclass
class TextChunk:
    """
    Represents a chunk of text ready to be embedded.
    """
    text: str
    chunk_index: int
    char_count: int
    chunking_strategy: str
    page_number: Optional[int] = None
    layout_context: dict = field(default_factory=dict)
    token_count: Optional[int] = None
