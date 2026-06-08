from typing import List
from .base import BaseEmbedder
from sentence_transformers import SentenceTransformer

# Load the model lazily or globally so it doesn't reload on every request
_model = None

class LocalEmbedder(BaseEmbedder):
    """
    Embedder using sentence-transformers running locally.
    Default model: all-MiniLM-L6-v2 (384 dimensions).
    """
    
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        self._model_name = model_name
        self._dimensions = 384  # For all-MiniLM-L6-v2
            
    def embed(self, texts: List[str]) -> List[List[float]]:
        global _model
        if _model is None:
            # Load model lazily here so it happens inside asyncio.to_thread (non-blocking)
            # This is crucial to avoid PyTorch deadlocks from initializing in main thread
            # but performing inference in a background thread.
            _model = SentenceTransformer(self._model_name)
            
        if not texts:
            return []
            
        # The encode method returns a numpy array, we convert to list of floats for pgvector
        embeddings = _model.encode(texts, convert_to_numpy=True)
        return embeddings.tolist()
        
    @property
    def model_name(self) -> str:
        return self._model_name
        
    @property
    def dimensions(self) -> int:
        return self._dimensions
