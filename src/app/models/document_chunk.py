import uuid as uuid_pkg
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from uuid6 import uuid7

from ..core.db.database import Base


class DocumentChunk(Base):
    __tablename__ = "document_chunk"

    # ---- Identity ----
    id: Mapped[int] = mapped_column(autoincrement=True, primary_key=True, init=False)
    extraction_id: Mapped[int] = mapped_column(ForeignKey("document_extraction.id"), index=True, init=False)

    # ---- Required fields (no defaults) ----
    chunk_index: Mapped[int] = mapped_column(Integer)
    chunking_strategy: Mapped[str] = mapped_column(String(30), index=True)
    text: Mapped[str] = mapped_column(Text)
    char_count: Mapped[int] = mapped_column(Integer)

    # ---- Optional / auto fields (have defaults) ----
    uuid: Mapped[uuid_pkg.UUID] = mapped_column(UUID(as_uuid=True), default_factory=uuid7, unique=True, index=True)

    # Pre-computed approximate token count for LLM context window management.
    # Nullable because token count depends on the tokenizer of the target LLM.
    token_count: Mapped[int | None] = mapped_column(Integer, default=None)

    # PDF page number. Null for Markdown / plain text files which have no page concept.
    page_number: Mapped[int | None] = mapped_column(Integer, default=None)

    # Strategy-specific structural metadata stored as flexible JSON.
    # Layout-aware: {"h1": "...", "h2": "...", "section_path": "..."}
    # Fixed-size:   {"start_char": 0, "end_char": 512}
    # Recursive:    {"separator_used": "\n\n", "start_char": 0}
    # Semantic:     {"topic_break_score": 0.82}
    layout_context: Mapped[dict | None] = mapped_column(JSONB, default=None)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default_factory=lambda: datetime.now(UTC)
    )
