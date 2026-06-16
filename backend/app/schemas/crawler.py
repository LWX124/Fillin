from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class CrawlerTaskCreate(BaseModel):
    knowledge_base_id: str
    platform: str
    target_url: str
    target_name: Optional[str] = None


class CrawlerTaskResponse(BaseModel):
    id: str
    knowledge_base_id: str
    platform: str
    target_url: str
    target_name: Optional[str]
    status: str
    items_crawled: int
    items_imported: int
    error_message: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class ScheduledCrawlCreate(BaseModel):
    knowledge_base_id: str
    platform: str
    target_url: str
    target_name: Optional[str] = None
    interval_hours: int = 24


class ScheduledCrawlResponse(BaseModel):
    id: str
    knowledge_base_id: str
    platform: str
    target_url: str
    target_name: Optional[str]
    interval_hours: int
    is_active: bool
    last_run_at: Optional[datetime]
    next_run_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class CrawlerCookieCreate(BaseModel):
    platform: str
    cookies_json: str


class CrawlerCookieResponse(BaseModel):
    id: str
    platform: str
    created_at: datetime

    class Config:
        from_attributes = True
