from typing import List, Dict, Optional
from .base import BaseChunker
from ..schemas import ParsedElement, DocumentChunk

class LayoutAwareChunker(BaseChunker):
    """
    Chunks document elements while preserving structural hierarchy (headings).
    Each paragraph becomes a chunk, decorated with its current H1, H2, etc.
    If a heading itself is encountered, it is tracked as context but not 
    necessarily chunked by itself unless we want it to be searchable directly.
    For now, we embed the headings into the chunk text or just store in context.
    """
    
    def __init__(self, include_context_in_text: bool = True):
        self.include_context_in_text = include_context_in_text
        
    def chunk(self, elements: List[ParsedElement]) -> List[DocumentChunk]:
        chunks: List[DocumentChunk] = []
        current_context: Dict[str, str] = {}
        chunk_idx = 0
        
        for el in elements:
            # If it's a heading, update the current context
            if el.element_type.startswith("h") and el.element_type[1:].isdigit():
                level = int(el.element_type[1:])
                current_context[f"h{level}"] = el.text
                
                # Clear out lower-level headings
                # (e.g., if we hit an h1, clear h2, h3, h4)
                keys_to_remove = [k for k in current_context.keys() if k.startswith("h") and int(k[1:]) > level]
                for k in keys_to_remove:
                    del current_context[k]
                    
                # We also create a chunk for the heading itself so it's searchable
                chunks.append(self._create_chunk(el.text, current_context, el.page_number, chunk_idx))
                chunk_idx += 1
                
            elif el.element_type == "title":
                current_context["title"] = el.text
                chunks.append(self._create_chunk(el.text, current_context, el.page_number, chunk_idx))
                chunk_idx += 1
                
            else:
                # It's a paragraph, list item, etc.
                chunks.append(self._create_chunk(el.text, current_context, el.page_number, chunk_idx))
                chunk_idx += 1
                
        return chunks
        
    def _create_chunk(self, text: str, context: Dict[str, str], page: Optional[int], index: int) -> DocumentChunk:
        # Optionally prepend the context path to the chunk text for better semantic embeddings
        # E.g., "Title > Heading 1 > Heading 2:\n\nThe paragraph text..."
        final_text = text
        if self.include_context_in_text and context:
            path_parts = []
            if "title" in context: path_parts.append(context["title"])
            for i in range(1, 7):
                if f"h{i}" in context:
                    path_parts.append(context[f"h{i}"])
            
            if path_parts:
                path_str = " > ".join(path_parts)
                # Avoid prepending the exact same text if the chunk is the heading itself
                if text not in path_parts:
                    final_text = f"{path_str}:\n{text}"
                    
        return DocumentChunk(
            text=final_text,
            chunk_index=index,
            char_count=len(final_text),
            chunking_strategy="layout_aware",
            page_number=page,
            layout_context=context.copy(),
            token_count=None # We could estimate here if needed, e.g. char_count / 4
        )
