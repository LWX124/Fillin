import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from app.db.base_class import Base


class Content(Base):
    __tablename__ = "contents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    knowledge_base_id = Column(String(36), ForeignKey("knowledge_bases.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(Text, nullable=False)
    content = Column(Text, nullable=False)
    content_html = Column(Text)
    source_platform = Column(String(50))
    source_url = Column(Text)
    author = Column(String(255))
    published_at = Column(DateTime)
    metadata_json = Column(JSONB)
    is_vectorized = Column(Boolean, default=False)
    vector_ids = Column(ARRAY(String))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, onupdate=lambda: datetime.now(timezone.utc))
