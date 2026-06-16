from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey
from app.db.base_class import Base
from datetime import datetime, timezone


class ScheduledCrawl(Base):
    __tablename__ = "scheduled_crawls"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    knowledge_base_id = Column(String(36), ForeignKey("knowledge_bases.id", ondelete="CASCADE"), nullable=False)

    platform = Column(String(50), nullable=False)
    target_url = Column(String(500), nullable=False)
    target_name = Column(String(200))

    interval_hours = Column(Integer, default=24, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    last_run_at = Column(DateTime)
    next_run_at = Column(DateTime, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, onupdate=lambda: datetime.now(timezone.utc))
