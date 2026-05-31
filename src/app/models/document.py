import uuid as uuid_pkg
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from uuid6 import uuid7

from ..core.db.database import Base


class Document(Base):
    __tablename__ = "document"

    id: Mapped[int] = mapped_column(autoincrement=True, primary_key=True, init=False)
    uuid: Mapped[uuid_pkg.UUID] = mapped_column(UUID(as_uuid=True), default_factory=uuid7, unique=True, index=True)
    
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, init=False)
    
    file_name: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[str] = mapped_column(String(100))
    size_in_bytes: Mapped[int] = mapped_column(Integer)
    
    sha256: Mapped[str | None] = mapped_column(String(64), default=None, index=True)
    storage_path: Mapped[str] = mapped_column(String(500))
    
    status: Mapped[str] = mapped_column(String(30), default="uploaded", index=True)
    error_message: Mapped[str | None] = mapped_column(Text, default=None)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
