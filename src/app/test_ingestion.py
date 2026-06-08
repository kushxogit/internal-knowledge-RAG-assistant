import asyncio
import os
import sys
from pathlib import Path

# Add /code (or src) to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.db.database import local_session, async_engine
from app.models.user import User
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.chunk_embedding import ChunkEmbedding
from app.rag.ingestion import process_document
from sqlalchemy import select

async def main():
    # 1. Create a dummy markdown file
    sample_dir = Path("sample_docs")
    sample_dir.mkdir(exist_ok=True)
    
    md_file = sample_dir / "hr_policy.md"
    md_file.write_text("""# HR Policy
    
Welcome to the company!

## Time Off
You get 20 days of PTO per year.

### Sick Leave
You also get 5 days of sick leave.

## Code of Conduct
Be nice to each other.
""", encoding='utf-8')

    async with local_session() as db:
        # Get or create a dummy user
        user_res = await db.execute(select(User).where(User.email == "test@example.com"))
        user = user_res.scalar_one_or_none()
        if not user:
            user = User(name="Test User", username="testuser", email="test@example.com", hashed_password="pwd", is_superuser=False)
            db.add(user)
            await db.commit()
            await db.refresh(user)

        # Create a dummy document record
        doc = Document(
            file_name="hr_policy.md",
            content_type="text/markdown",
            size_in_bytes=len(md_file.read_text(encoding='utf-8')),
            storage_path=str(md_file),
            status="uploaded"
        )
        doc.user_id = user.id
        db.add(doc)
        await db.commit()
        await db.refresh(doc)
        
        doc_id = doc.id
        print(f"Created dummy document in DB with ID: {doc_id}")

    # Process the document in a new session
    async with local_session() as db:
        print("Starting ingestion pipeline... (This might take a moment to download the embedding model)")
        result = await process_document(db, doc_id)
        print("Ingestion complete!")
        print(result)

    # Verify results
    async with local_session() as db:
        print("\n--- Verifying Chunks ---")
        chunks_res = await db.execute(select(DocumentChunk).where(DocumentChunk.extraction_id == doc_id)) # Not exactly right, extraction_id != doc_id usually, but let's just query all chunks for now
        
        # Proper query:
        from app.models.document_extraction import DocumentExtraction
        extr_res = await db.execute(select(DocumentExtraction).where(DocumentExtraction.document_id == doc_id))
        extr = extr_res.scalar_one()
        
        chunks_res = await db.execute(select(DocumentChunk).where(DocumentChunk.extraction_id == extr.id).order_by(DocumentChunk.chunk_index))
        chunks = chunks_res.scalars().all()
        
        for c in chunks:
            print(f"\nChunk {c.chunk_index} ({c.char_count} chars, Context: {c.layout_context}):")
            print(f"Text:\n{c.text}")
            
        print("\n--- Verifying Embeddings ---")
        emb_res = await db.execute(select(ChunkEmbedding))
        embeddings = emb_res.scalars().all()
        print(f"Total embeddings in DB: {len(embeddings)}")
        if embeddings:
            emb = embeddings[0]
            print(f"Sample Embedding [0] vector size: {len(emb.embedding)}")
            
    # Cleanup DB changes for the test script isn't necessary here since we're just testing, but we can close engine.
    await async_engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
