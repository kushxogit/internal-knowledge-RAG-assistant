import uuid as uuid_pkg
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from uuid6 import uuid7

from ..core.db.database import Base


class DocumentExtraction(Base):
    __tablename__ = "document_extraction"

    id: Mapped[int] = mapped_column(autoincrement=True, primary_key=True, init=False)
    document_id: Mapped[int] = mapped_column(ForeignKey("document.id"), index=True, init=False)
    
    extractor: Mapped[str] = mapped_column(String(80))
    extractor_version: Mapped[str] = mapped_column(String(40))
    raw_text: Mapped[str] = mapped_column(Text)
    
    uuid: Mapped[uuid_pkg.UUID] = mapped_column(UUID(as_uuid=True), default_factory=uuid7, unique=True, index=True)
    status: Mapped[str] = mapped_column(String(20), default="processing", index=True)
    error_message: Mapped[str | None] = mapped_column(Text, default=None)
    text_sha256: Mapped[str | None] = mapped_column(String(64), default=None, index=True)
    
    char_count: Mapped[int] = mapped_column(Integer, default=0)
    page_count: Mapped[int | None] = mapped_column(Integer, default=None)
    meta_json: Mapped[dict | list | None] = mapped_column(JSONB, default=None)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=lambda: datetime.now(UTC))
