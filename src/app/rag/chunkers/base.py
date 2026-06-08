from abc import ABC, abstractmethod
from typing import List
from ..schemas import ParsedElement, DocumentChunk

class BaseChunker(ABC):
    """
    Base interface for all chunking strategies.
    """
    
    @abstractmethod
    def chunk(self, elements: List[ParsedElement]) -> List[DocumentChunk]:
        """
        Group parsed elements into chunks.
        
        Args:
            elements: List of structural elements extracted from a document.
            
        Returns:
            A list of DocumentChunk objects.
        """
        pass
