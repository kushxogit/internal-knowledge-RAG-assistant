import asyncio
import sys
from uuid import UUID
from sqlalchemy import select
from src.app.core.db.database import async_sessionmaker, engine
from src.app.models import DocumentChunk, Document, ChunkEmbedding, DocumentExtraction
from src.app.rag.embedders.local_embedder import LocalEmbedder

async def main():
    async with async_sessionmaker() as db:
        embedder = LocalEmbedder()
        query_vector = embedder.embed(["anthea"])[0]
        
        stmt = (
            select(DocumentChunk, Document, ChunkEmbedding.embedding.cosine_distance(query_vector).label("distance"))
            .join(ChunkEmbedding, ChunkEmbedding.chunk_id == DocumentChunk.id)
            .join(DocumentExtraction, DocumentExtraction.id == DocumentChunk.extraction_id)
            .join(Document, Document.id == DocumentExtraction.document_id)
            .where(ChunkEmbedding.embedding.cosine_distance(query_vector) < 0.6)
            .order_by(ChunkEmbedding.embedding.cosine_distance(query_vector))
            .limit(5)
        )
        
        result = await db.execute(stmt)
        rows = result.all()
        for row in rows:
            print(f"Row len: {len(row)}")
            print(f"Row: {row}")

if __name__ == "__main__":
    asyncio.run(main())
