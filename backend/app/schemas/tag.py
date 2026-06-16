from pydantic import BaseModel
from datetime import datetime
from typing import List


class TagCreate(BaseModel):
    name: str
    color: str = "#3B82F6"


class TagResponse(BaseModel):
    id: str
    name: str
    color: str
    created_at: datetime

    class Config:
        from_attributes = True


class AddTagsToContentRequest(BaseModel):
    tag_ids: List[str]
