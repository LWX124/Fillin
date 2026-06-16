from pydantic import BaseModel
from typing import List


class ContentGenerationRequest(BaseModel):
    knowledge_base_ids: List[str]
    topic: str
    content_type: str = "article"


class ContentGenerationResponse(BaseModel):
    content: str
    outline: str
    token_count: int
    credits_used: int
