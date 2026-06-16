from sqlalchemy import Column, String, ForeignKey, DateTime
from app.db.base_class import Base
from datetime import datetime, timezone


class Tag(Base):
    __tablename__ = "tags"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(50), nullable=False)
    color = Column(String(7), default="#3B82F6")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
