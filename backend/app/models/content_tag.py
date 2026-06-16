from sqlalchemy import Column, String, ForeignKey, DateTime
from app.db.base_class import Base
from datetime import datetime, timezone


class ContentTag(Base):
    __tablename__ = "content_tags"

    id = Column(String(36), primary_key=True)
    content_id = Column(String(36), ForeignKey("contents.id", ondelete="CASCADE"), nullable=False)
    tag_id = Column(String(36), ForeignKey("tags.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
