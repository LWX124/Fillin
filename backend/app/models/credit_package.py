from sqlalchemy import Column, String, Integer, Numeric, Boolean
from app.db.base_class import Base


class CreditPackage(Base):
    __tablename__ = "credit_packages"

    id = Column(String(36), primary_key=True)
    name = Column(String(100), nullable=False)
    credits = Column(Integer, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    display_order = Column(Integer, default=0)
