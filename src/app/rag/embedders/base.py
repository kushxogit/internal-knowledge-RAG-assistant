from abc import ABC, abstractmethod
from typing import List

class BaseEmbedder(ABC):
    """
    Base interface for all embedding models.
    """
    
    @abstractmethod
    def embed(self, texts: List[str]) -> List[List[float]]:
        """
        Generate vector embeddings for a list of texts.
        
        Args:
            texts: A list of text strings to embed.
            
        Returns:
            A list of float lists, where each float list is the embedding vector for the corresponding text.
        """
        pass
    
    @property
    @abstractmethod
    def model_name(self) -> str:
        """Name of the embedding model."""
        pass
        
    @property
    @abstractmethod
    def dimensions(self) -> int:
        """Dimensionality of the embeddings produced by this model."""
        pass
