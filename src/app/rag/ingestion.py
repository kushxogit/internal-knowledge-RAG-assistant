import asyncio
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from .parsers import MarkdownParser, DocxParser, PdfParser
from .chunkers import LayoutAwareChunker
from .embedders import LocalEmbedder
from ..models import Document, DocumentExtraction, DocumentChunk, ChunkEmbedding

async def process_document(db: AsyncSession, document_id: int):
    """
    End-to-end ingestion pipeline for a single document.
    """
    # 1. Fetch document from DB
    result = await db.execute(select(Document).filter(Document.id == document_id))
    document = result.scalar_one_or_none()
    
    if not document:
        raise ValueError(f"Document with id {document_id} not found.")
        
    file_path = Path(document.storage_path)
    if not file_path.exists():
        raise FileNotFoundError(f"File not found at {file_path}")
        
    # 2. Determine parser based on content type or extension
    ext = file_path.suffix.lower()
    if ext == '.pdf':
        parser = PdfParser()
        extractor_name = "pdfplumber"
    elif ext == '.docx':
        parser = DocxParser()
        extractor_name = "python-docx"
    elif ext in ['.md', '.txt']:
        parser = MarkdownParser()
        extractor_name = "markdown_regex"
    else:
        raise ValueError(f"Unsupported file type: {ext}")
        
    # 3. Parse Document (Run blocking CPU-bound tasks in a threadpool)
    parsed_elements = await asyncio.to_thread(parser.parse, file_path)
    
    # Concatenate raw text for the extraction record
    raw_text = "\n\n".join(e.text for e in parsed_elements)
    
    # Save Extraction
    extraction = DocumentExtraction(
        extractor=extractor_name,
        extractor_version="1.0",
        raw_text=raw_text,
        char_count=len(raw_text),
        status="completed"
    )
    extraction.document_id = document.id
    db.add(extraction)
    await db.flush() # Flush to get extraction.id
    
    # 4. Chunk Document
    chunker = LayoutAwareChunker()
    chunks = chunker.chunk(parsed_elements)
    
    # Save Chunks
    db_chunks = []
    for c in chunks:
        db_chunk = DocumentChunk(
            chunk_index=c.chunk_index,
            chunking_strategy=c.chunking_strategy,
            text=c.text,
            char_count=c.char_count,
            page_number=c.page_number,
            layout_context=c.layout_context
        )
        db_chunk.extraction_id = extraction.id
        db_chunks.append(db_chunk)
        
    db.add_all(db_chunks)
    await db.flush() # Flush to get chunk IDs
    
    # 5. Embed Chunks
    embedder = LocalEmbedder()
    chunk_texts = [c.text for c in chunks]
    embeddings = await asyncio.to_thread(embedder.embed, chunk_texts)
    
    # Save Embeddings
    db_embeddings = []
    for db_chunk, emb in zip(db_chunks, embeddings):
        db_emb = ChunkEmbedding(
            model_name=embedder.model_name,
            model_version="1.0",
            dimensions=embedder.dimensions,
            embedding=emb
        )
        db_emb.chunk_id = db_chunk.id
        db_embeddings.append(db_emb)
        
    db.add_all(db_embeddings)
    
    # Update Document status
    document.status = "processed"
    
    # 6. Commit all to DB
    await db.commit()
    
    return {
        "document_id": document.id,
        "chunks_created": len(db_chunks),
        "embeddings_created": len(db_embeddings)
    }
