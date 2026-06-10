import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from .embedders.local_embedder import LocalEmbedder
from ..models import ChunkEmbedding, DocumentChunk, DocumentExtraction, Document

class Retriever:
    """
    Handles retrieving the most semantically relevant document chunks 
    for a given text query.
    """
    def __init__(self, db: AsyncSession):
        self.db = db
        self.embedder = LocalEmbedder()
        
    async def search(self, query: str, top_k: int = 5, document_uuid: str | None = None, distance_threshold: float = 1.0) -> list[tuple[DocumentChunk, Document, float, str, float]]:
        """
        Performs Hybrid Search using Vector (Cosine Distance) and Lexical (BM25 + ILIKE).
        Merges results using Reciprocal Rank Fusion (RRF).
        Returns list of (DocumentChunk, Document, rrf_score, search_source, raw_distance)
        """
        # Embed the query
        query_vector = await asyncio.to_thread(self.embedder.embed, [query])
        query_vector = query_vector[0]
        
        uuid_condition = None
        if document_uuid:
            from uuid import UUID
            uuid_condition = Document.uuid == UUID(document_uuid)

        # --- 1. Vector Search Query ---
        vector_stmt = (
            select(DocumentChunk, Document, ChunkEmbedding.embedding.cosine_distance(query_vector).label("distance"))
            .join(ChunkEmbedding, ChunkEmbedding.chunk_id == DocumentChunk.id)
            .join(DocumentExtraction, DocumentExtraction.id == DocumentChunk.extraction_id)
            .join(Document, Document.id == DocumentExtraction.document_id)
            .where(ChunkEmbedding.embedding.cosine_distance(query_vector) < distance_threshold)
        )
        if uuid_condition is not None:
            vector_stmt = vector_stmt.where(uuid_condition)
        vector_stmt = vector_stmt.order_by(ChunkEmbedding.embedding.cosine_distance(query_vector)).limit(top_k * 2)

        # --- 2. Keyword Search Query ---
        tsvector = func.to_tsvector('english', DocumentChunk.text)
        tsquery = func.websearch_to_tsquery('english', query)
        rank = func.ts_rank_cd(tsvector, tsquery)

        keyword_stmt = (
            select(DocumentChunk, Document, rank.label("rank"), ChunkEmbedding.embedding.cosine_distance(query_vector).label("distance"))
            .join(ChunkEmbedding, ChunkEmbedding.chunk_id == DocumentChunk.id)
            .join(DocumentExtraction, DocumentExtraction.id == DocumentChunk.extraction_id)
            .join(Document, Document.id == DocumentExtraction.document_id)
            .where(or_(tsvector.op('@@')(tsquery), DocumentChunk.text.ilike(f"%{query}%")))
        )
        if uuid_condition is not None:
            keyword_stmt = keyword_stmt.where(uuid_condition)
        keyword_stmt = keyword_stmt.order_by(rank.desc()).limit(top_k * 2)

        # --- 3. Execute in Parallel ---
        vector_result, keyword_result = await asyncio.gather(
            self.db.execute(vector_stmt),
            self.db.execute(keyword_stmt)
        )

        vector_rows = vector_result.all()
        keyword_rows = keyword_result.all()

        # --- 4. Reciprocal Rank Fusion (RRF) ---
        rrf_scores = {}
        chunk_map = {}
        doc_map = {}
        source_map = {}
        distance_map = {}
        k = 60

        for r, row in enumerate(vector_rows, 1):
            chunk, doc, dist = row
            chunk_map[chunk.id] = chunk
            doc_map[chunk.id] = doc
            distance_map[chunk.id] = dist
            rrf_scores[chunk.id] = rrf_scores.get(chunk.id, 0.0) + (1.0 / (k + r))
            source_map[chunk.id] = "Vector"

        for r, row in enumerate(keyword_rows, 1):
            chunk, doc, keyword_rank, dist = row
            chunk_map[chunk.id] = chunk
            doc_map[chunk.id] = doc
            distance_map[chunk.id] = dist
            rrf_scores[chunk.id] = rrf_scores.get(chunk.id, 0.0) + (1.0 / (k + r))
            if chunk.id in source_map and source_map[chunk.id] == "Vector":
                source_map[chunk.id] = "Hybrid"
            else:
                source_map[chunk.id] = "Keyword"

        # Sort by RRF score descending and return top_k
        sorted_chunks = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)[:top_k]
        return [(chunk_map[cid], doc_map[cid], score, source_map[cid], distance_map[cid]) for cid, score in sorted_chunks]
