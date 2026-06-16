from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class KnowledgeBaseCreate(BaseModel):
    name: str
    description: Optional[str] = None


class KnowledgeBaseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class KnowledgeBaseResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    content_count: int
    created_at: datetime

    class Config:
        from_attributes = True
