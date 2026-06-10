import logging
import os
import sys
from pathlib import Path
from uuid import UUID
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from ...core.db.database import async_get_db
from ...models.document import Document
from ...models.document_chunk import DocumentChunk
from ...models.chunk_embedding import ChunkEmbedding
from ...models.document_extraction import DocumentExtraction
from ...models.user import User
from ...rag.ingestion import process_document

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["documents"])

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


async def get_or_create_default_user(db: AsyncSession) -> User:
    """Gets or creates a default user to associate with uploaded documents."""
    user_res = await db.execute(select(User).where(User.email == "test@example.com"))
    user = user_res.scalar_one_or_none()
    if not user:
        user = User(
            name="Test User",
            username="testuser",
            email="test@example.com",
            hashed_password="pwd",
            is_superuser=False,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user


async def run_ingestion_in_background(document_id: int) -> None:
    """Ingestion pipeline run in the background to avoid blocking request response."""
    from ...core.db.database import local_session
    
    async with local_session() as db:
        try:
            await process_document(db, document_id)
        except Exception as e:
            logger.exception(f"Background ingestion failed for document ID {document_id}")
            doc_res = await db.execute(select(Document).where(Document.id == document_id))
            doc = doc_res.scalar_one_or_none()
            if doc:
                doc.status = "error"
                doc.error_message = str(e)
                await db.commit()


@router.get("/")
async def list_documents(db: AsyncSession = Depends(async_get_db)) -> list[dict[str, Any]]:
    """Lists all uploaded documents."""
    result = await db.execute(select(Document).order_by(Document.created_at.desc()))
    documents = result.scalars().all()
    
    return [
        {
            "id": doc.id,
            "uuid": str(doc.uuid),
            "file_name": doc.file_name,
            "content_type": doc.content_type,
            "size_in_bytes": doc.size_in_bytes,
            "status": doc.status,
            "error_message": doc.error_message,
            "created_at": doc.created_at.isoformat() if doc.created_at else None,
        }
        for doc in documents
    ]


@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(async_get_db),
) -> dict[str, Any]:
    """Uploads a document file and queues it for chunking and vectorization."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
        
    ext = Path(file.filename).suffix.lower()
    if ext not in [".pdf", ".docx", ".txt", ".md"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Supported formats: PDF, DOCX, TXT, MD",
        )
        
    # Save the file to local uploads directory
    file_path = UPLOAD_DIR / file.filename
    content = await file.read()
    file_path.write_bytes(content)
    
    # Get standard dummy user
    user = await get_or_create_default_user(db)
    
    # Create Document record
    doc = Document(
        file_name=file.filename,
        content_type=file.content_type or "application/octet-stream",
        size_in_bytes=len(content),
        storage_path=str(file_path),
        status="uploaded",
    )
    doc.user_id = user.id
    
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    
    # Queue background task
    background_tasks.add_task(run_ingestion_in_background, doc.id)
    
    return {
        "id": doc.id,
        "uuid": str(doc.uuid),
        "file_name": doc.file_name,
        "status": doc.status,
        "size_in_bytes": doc.size_in_bytes,
    }


@router.get("/{doc_uuid}/text")
async def get_document_text(doc_uuid: str, db: AsyncSession = Depends(async_get_db)) -> dict[str, Any]:
    """Fetches extracted text for a specific document."""
    try:
        uuid_obj = UUID(doc_uuid)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")
        
    doc_res = await db.execute(select(Document).where(Document.uuid == uuid_obj))
    doc = doc_res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    extr_res = await db.execute(select(DocumentExtraction).where(DocumentExtraction.document_id == doc.id))
    extr = extr_res.scalar_one_or_none()
    
    raw_text = ""
    if extr:
        raw_text = extr.raw_text
    elif doc.status == "uploaded":
        raw_text = "Document is still processing..."
    elif doc.status == "error":
        raw_text = f"Processing Error: {doc.error_message}"
        
    return {
        "file_name": doc.file_name,
        "text": raw_text,
        "status": doc.status,
        "uuid": str(doc.uuid),
    }

@router.get("/{doc_uuid}/file")
async def get_document_file(doc_uuid: str, db: AsyncSession = Depends(async_get_db)):
    """Returns the raw file for rendering in the browser."""
    try:
        uuid_obj = UUID(doc_uuid)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")
        
    doc_res = await db.execute(select(Document).where(Document.uuid == uuid_obj))
    doc = doc_res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if not os.path.exists(doc.storage_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
        
    return FileResponse(
        doc.storage_path, 
        media_type=doc.content_type, 
        headers={"Content-Disposition": f"inline; filename=\"{doc.file_name}\""}
    )


@router.delete("/{doc_uuid}")
async def delete_document(doc_uuid: str, db: AsyncSession = Depends(async_get_db)) -> dict[str, str]:
    """Deletes a document and all corresponding chunks/embeddings cascade-style."""
    try:
        uuid_obj = UUID(doc_uuid)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")
        
    doc_res = await db.execute(select(Document).where(Document.uuid == uuid_obj))
    doc = doc_res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    extr_res = await db.execute(select(DocumentExtraction).where(DocumentExtraction.document_id == doc.id))
    extractions = extr_res.scalars().all()
    
    # Cascade delete in DB manually to avoid missing ForeignKey ON DELETE constraints
    for extr in extractions:
        chunks_res = await db.execute(select(DocumentChunk.id).where(DocumentChunk.extraction_id == extr.id))
        chunk_ids = chunks_res.scalars().all()
        
        if chunk_ids:
            await db.execute(delete(ChunkEmbedding).where(ChunkEmbedding.chunk_id.in_(chunk_ids)))
            
        await db.execute(delete(DocumentChunk).where(DocumentChunk.extraction_id == extr.id))
        
    await db.execute(delete(DocumentExtraction).where(DocumentExtraction.document_id == doc.id))
    await db.execute(delete(Document).where(Document.id == doc.id))
    
    # Remove local file if present
    try:
        if os.path.exists(doc.storage_path):
            os.remove(doc.storage_path)
    except Exception as e:
        logger.warning(f"Failed to remove physical file {doc.storage_path}: {e}")
        
    await db.commit()
    
    return {"message": f"Document '{doc.file_name}' deleted successfully"}
