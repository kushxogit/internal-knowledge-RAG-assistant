import asyncio
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from .parsers.base import BaseParser
from .parsers.markdown_parser import MarkdownParser
from .parsers.docx_parser import DocxParser
from .parsers.pdf_parser import PdfParser
from .chunkers.layout_aware import LayoutAwareChunker
from .embedders.local_embedder import LocalEmbedder
from .schemas import ParsedTextElement, TextChunk
from ..models import Document, DocumentExtraction, DocumentChunk, ChunkEmbedding

async def process_document(db: AsyncSession, document_id: int) -> dict:
    """
    End-to-end ingestion pipeline for a single document.
    """
    document = await _fetch_document(db, document_id)
    file_path = Path(document.storage_path)
    
    if not file_path.exists():
        raise FileNotFoundError(f"File not found at {file_path}")
        
    # 1. Parse Document
    parser, extractor_name = _get_parser_for_extension(file_path.suffix)
    parsed_elements = await _extract_elements_from_file(file_path, parser)
    
    # 2. Chunk Document
    chunks = _chunk_elements(parsed_elements)
    
    # 3. Generate Embeddings
    embeddings = await _generate_embeddings_for_chunks(chunks)
    
    # 4. Save Everything to DB
    result_metrics = await _save_ingestion_results_to_db(
        db=db,
        document=document,
        parsed_elements=parsed_elements,
        extractor_name=extractor_name,
        chunks=chunks,
        embeddings=embeddings
    )
    
    return result_metrics

async def _fetch_document(db: AsyncSession, document_id: int) -> Document:
    result = await db.execute(select(Document).filter(Document.id == document_id))
    document = result.scalar_one_or_none()
    if not document:
        raise ValueError(f"Document with id {document_id} not found.")
    return document

def _get_parser_for_extension(extension: str) -> tuple[BaseParser, str]:
    ext = extension.lower()
    if ext == '.pdf':
        return PdfParser(), "pdfplumber"
    elif ext == '.docx':
        return DocxParser(), "python-docx"
    elif ext in ['.md', '.txt']:
        return MarkdownParser(), "markdown_regex"
    else:
        raise ValueError(f"Unsupported file type: {ext}")

async def _extract_elements_from_file(file_path: Path, parser: BaseParser) -> list[ParsedTextElement]:
    # Run blocking CPU-bound parsing in a threadpool
    return await asyncio.to_thread(parser.parse, file_path)

def _chunk_elements(elements: list[ParsedTextElement]) -> list[TextChunk]:
    chunker = LayoutAwareChunker()
    return chunker.chunk(elements)

async def _generate_embeddings_for_chunks(chunks: list[TextChunk]) -> list[list[float]]:
    embedder = LocalEmbedder()
    chunk_texts = [c.text for c in chunks]
    return await asyncio.to_thread(embedder.embed, chunk_texts)

async def _save_ingestion_results_to_db(
    db: AsyncSession, 
    document: Document, 
    parsed_elements: list[ParsedTextElement], 
    extractor_name: str,
    chunks: list[TextChunk],
    embeddings: list[list[float]]
) -> dict:
    
    # Save Extraction
    raw_text = "\n\n".join(e.text for e in parsed_elements)
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
    
    # Save Embeddings
    embedder_meta = LocalEmbedder() # Just for metadata
    db_embeddings = []
    for db_chunk, emb in zip(db_chunks, embeddings):
        db_emb = ChunkEmbedding(
            model_name=embedder_meta.model_name,
            model_version="1.0",
            dimensions=embedder_meta.dimensions,
            embedding=emb
        )
        db_emb.chunk_id = db_chunk.id
        db_embeddings.append(db_emb)
        
    db.add_all(db_embeddings)
    
    # Update Document status
    document.status = "processed"
    
    # Commit all to DB
    await db.commit()
    
    return {
        "document_id": document.id,
        "chunks_created": len(db_chunks),
        "embeddings_created": len(db_embeddings)
    }
