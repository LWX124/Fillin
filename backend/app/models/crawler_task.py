from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Enum as SAEnum
from app.db.base_class import Base
from datetime import datetime, timezone
import enum


class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class CrawlerTask(Base):
    __tablename__ = "crawler_tasks"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    knowledge_base_id = Column(String(36), ForeignKey("knowledge_bases.id", ondelete="CASCADE"), nullable=False)

    platform = Column(String(50), nullable=False)
    target_url = Column(String(500), nullable=False)
    target_name = Column(String(200))

    status = Column(SAEnum(TaskStatus), default=TaskStatus.PENDING, nullable=False)
    items_crawled = Column(Integer, default=0)
    items_imported = Column(Integer, default=0)
    error_message = Column(Text)

    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, onupdate=lambda: datetime.now(timezone.utc))
