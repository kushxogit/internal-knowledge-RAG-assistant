from abc import ABC, abstractmethod
from typing import List
from ..schemas import ParsedTextElement, TextChunk

class BaseChunker(ABC):
    """
    Base interface for all text chunkers.
    """
    
    @abstractmethod
    def chunk(self, elements: List[ParsedTextElement]) -> List[TextChunk]:
        """
        Convert a list of parsed elements into chunks suitable for embedding.
        
        Args:
            elements: A list of structural elements parsed from a document.
            
        Returns:
            A list of TextChunk objects.
        """
        pass
