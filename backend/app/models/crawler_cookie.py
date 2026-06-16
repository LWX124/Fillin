from sqlalchemy import Column, String, ForeignKey, Text, DateTime
from app.db.base_class import Base
from datetime import datetime, timezone


class CrawlerCookie(Base):
    __tablename__ = "crawler_cookies"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    platform = Column(String(50), nullable=False)
    cookies_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, onupdate=lambda: datetime.now(timezone.utc))
