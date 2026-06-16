from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all database models."""
    
    @declared_attr
    def __tablename__(cls) -> str:
        return cls.__name__.lower()
