from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ContentCreate(BaseModel):
    title: str
    content: str
    source_platform: Optional[str] = "manual"
    source_url: Optional[str] = None


class ContentResponse(BaseModel):
    id: str
    title: str
    content: str
    source_platform: Optional[str]
    source_url: Optional[str]
    is_vectorized: bool
    created_at: datetime

    class Config:
        from_attributes = True
