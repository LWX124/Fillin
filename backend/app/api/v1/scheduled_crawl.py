from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid
from datetime import datetime, timedelta, timezone

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.scheduled_crawl import ScheduledCrawl
from app.models.knowledge_base import KnowledgeBase
from app.schemas.crawler import ScheduledCrawlCreate, ScheduledCrawlResponse

router = APIRouter()


@router.post("/scheduled-crawls", response_model=ScheduledCrawlResponse, status_code=201)
def create_scheduled_crawl(
    crawl_in: ScheduledCrawlCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    kb = db.query(KnowledgeBase).filter(
        KnowledgeBase.id == crawl_in.knowledge_base_id,
        KnowledgeBase.user_id == current_user.id,
    ).first()
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    next_run = datetime.now(timezone.utc) + timedelta(hours=crawl_in.interval_hours)

    crawl = ScheduledCrawl(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        knowledge_base_id=crawl_in.knowledge_base_id,
        platform=crawl_in.platform,
        target_url=crawl_in.target_url,
        target_name=crawl_in.target_name,
        interval_hours=crawl_in.interval_hours,
        next_run_at=next_run,
    )
    db.add(crawl)
    db.commit()
    db.refresh(crawl)
    return crawl


@router.get("/scheduled-crawls", response_model=List[ScheduledCrawlResponse])
def list_scheduled_crawls(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(ScheduledCrawl)
        .filter(ScheduledCrawl.user_id == current_user.id)
        .order_by(ScheduledCrawl.created_at.desc())
        .all()
    )


@router.delete("/scheduled-crawls/{crawl_id}", status_code=204)
def delete_scheduled_crawl(
    crawl_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    crawl = db.query(ScheduledCrawl).filter(
        ScheduledCrawl.id == crawl_id,
        ScheduledCrawl.user_id == current_user.id,
    ).first()
    if not crawl:
        raise HTTPException(status_code=404, detail="Scheduled crawl not found")
    db.delete(crawl)
    db.commit()
    return None


@router.patch("/scheduled-crawls/{crawl_id}/toggle", response_model=ScheduledCrawlResponse)
def toggle_scheduled_crawl(
    crawl_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    crawl = db.query(ScheduledCrawl).filter(
        ScheduledCrawl.id == crawl_id,
        ScheduledCrawl.user_id == current_user.id,
    ).first()
    if not crawl:
        raise HTTPException(status_code=404, detail="Scheduled crawl not found")
    crawl.is_active = not crawl.is_active
    db.commit()
    db.refresh(crawl)
    return crawl
