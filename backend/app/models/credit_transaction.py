import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from app.db.base_class import Base


class CreditTransaction(Base):
    __tablename__ = "credit_transactions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Integer, nullable=False)
    transaction_type = Column(String(50))
    description = Column(Text)
    related_entity_type = Column(String(50))
    related_entity_id = Column(String(36))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
