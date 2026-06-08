from typing import List, Dict, Optional
from .base import BaseChunker
from ..schemas import ParsedTextElement, TextChunk

class LayoutAwareChunker(BaseChunker):
    """
    Chunks document elements while preserving structural hierarchy (headings).
    Each paragraph becomes a chunk, decorated with its current H1, H2, etc.
    """
    
    def __init__(self, include_context_in_text: bool = True):
        self.include_context_in_text = include_context_in_text
        
    def chunk(self, elements: List[ParsedTextElement]) -> List[TextChunk]:
        chunks: List[TextChunk] = []
        current_context: Dict[str, str] = {}
        chunk_idx = 0
        
        for el in elements:
            if self._is_heading(el.element_type):
                self._update_heading_context(current_context, el.element_type, el.text)
                chunks.append(self._create_chunk(el.text, current_context, el.page_number, chunk_idx))
                chunk_idx += 1
            elif el.element_type == "title":
                current_context["title"] = el.text
                chunks.append(self._create_chunk(el.text, current_context, el.page_number, chunk_idx))
                chunk_idx += 1
            else:
                chunks.append(self._create_chunk(el.text, current_context, el.page_number, chunk_idx))
                chunk_idx += 1
                
        return chunks
        
    def _is_heading(self, element_type: str) -> bool:
        return element_type.startswith("h") and element_type[1:].isdigit()
        
    def _update_heading_context(self, context: Dict[str, str], heading_type: str, text: str):
        level = int(heading_type[1:])
        context[f"h{level}"] = text
        
        # Clear out lower-level headings (e.g., if we hit an h1, clear h2, h3, h4)
        keys_to_remove = []
        for key in context.keys():
            if self._is_heading(key) and int(key[1:]) > level:
                keys_to_remove.append(key)
                
        for k in keys_to_remove:
            del context[k]
            
    def _create_chunk(self, text: str, context: Dict[str, str], page: Optional[int], index: int) -> TextChunk:
        final_text = self._prepend_context_to_text(text, context)
        
        return TextChunk(
            text=final_text,
            chunk_index=index,
            char_count=len(final_text),
            chunking_strategy="layout_aware",
            page_number=page,
            layout_context=context.copy(),
            token_count=None
        )
        
    def _prepend_context_to_text(self, text: str, context: Dict[str, str]) -> str:
        if not self.include_context_in_text or not context:
            return text
            
        path_parts = []
        if "title" in context:
            path_parts.append(context["title"])
            
        for i in range(1, 7):
            if f"h{i}" in context:
                path_parts.append(context[f"h{i}"])
                
        if not path_parts:
            return text
            
        # Avoid prepending the exact same text if the chunk is the heading itself
        if text in path_parts:
            return text
            
        path_str = " > ".join(path_parts)
        return f"{path_str}:\n{text}"
