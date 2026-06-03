import uuid as uuid_pkg
from datetime import UTC, datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from uuid6 import uuid7

from ..core.db.database import Base


class ChunkEmbedding(Base):
    __tablename__ = "chunk_embedding"

    # ---- Identity ----
    id: Mapped[int] = mapped_column(autoincrement=True, primary_key=True, init=False)
    chunk_id: Mapped[int] = mapped_column(ForeignKey("document_chunk.id"), index=True, init=False)

    # ---- Required fields (no defaults) ----

    # Name of the embedding model, e.g. "sentence-transformers/all-MiniLM-L6-v2".
    # Critical: query vectors MUST be produced by the same model as stored vectors.
    model_name: Mapped[str] = mapped_column(String(100))

    # Model version tag for reproducibility and identifying stale embeddings after upgrades.
    model_version: Mapped[str] = mapped_column(String(40))

    # Dimensionality of the vector, e.g. 384 for all-MiniLM-L6-v2.
    # Stored explicitly so any developer can understand the embedding space at a glance.
    dimensions: Mapped[int] = mapped_column(Integer)

    # The actual embedding vector. 384 floats for all-MiniLM-L6-v2.
    # pgvector indexes this column for fast approximate nearest-neighbour search.
    embedding: Mapped[list] = mapped_column(Vector(384))

    # ---- Optional / auto fields (have defaults) ----
    uuid: Mapped[uuid_pkg.UUID] = mapped_column(UUID(as_uuid=True), default_factory=uuid7, unique=True, index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default_factory=lambda: datetime.now(UTC)
    )
