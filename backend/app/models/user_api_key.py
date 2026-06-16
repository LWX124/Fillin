from sqlalchemy import Column, String, Text, ForeignKey, Boolean, DateTime
from app.db.base_class import Base
from datetime import datetime, timezone


class UserAPIKey(Base):
    __tablename__ = "user_api_keys"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String(50), nullable=False)
    api_key = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, onupdate=lambda: datetime.now(timezone.utc))
