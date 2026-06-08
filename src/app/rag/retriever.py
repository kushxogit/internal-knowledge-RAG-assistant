import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from .embedders.local_embedder import LocalEmbedder
from ..models.chunk_embedding import ChunkEmbedding
from ..models.document_chunk import DocumentChunk

class Retriever:
    """
    Handles retrieving the most semantically relevant document chunks 
    for a given text query.
    """
    def __init__(self, db: AsyncSession):
        self.db = db
        self.embedder = LocalEmbedder()
        
    async def search(self, query: str, top_k: int = 5) -> list[DocumentChunk]:
        """
        Embeds the query and performs a vector similarity search in the DB.
        Returns the top_k most relevant DocumentChunks.
        """
        # Embed the query
        query_vector = await asyncio.to_thread(self.embedder.embed, [query])
        query_vector = query_vector[0]
        
        # We want to find ChunkEmbeddings ordered by cosine distance to the query vector.
        # pgvector uses `<=>` for cosine distance.
        # The smaller the distance, the more similar the vectors.
        stmt = (
            select(DocumentChunk)
            .join(ChunkEmbedding, ChunkEmbedding.chunk_id == DocumentChunk.id)
            .order_by(ChunkEmbedding.embedding.cosine_distance(query_vector))
            .limit(top_k)
        )
        
        result = await self.db.execute(stmt)
        return result.scalars().all()
