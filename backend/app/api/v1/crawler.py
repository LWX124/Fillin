import uuid
import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.knowledge_base import KnowledgeBase
from app.models.crawler_task import CrawlerTask, TaskStatus
from app.models.crawler_cookie import CrawlerCookie
from app.schemas.crawler import (
    CrawlerTaskCreate,
    CrawlerTaskResponse,
    CrawlerCookieCreate,
    CrawlerCookieResponse,
)
from app.services.content_service import create_content_from_crawled

router = APIRouter()


def _run_crawler_task(task_id: str):
    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        asyncio.run(_execute_crawler(task_id, db))
    finally:
        db.close()


async def _execute_crawler(task_id: str, db: Session):
    task = db.query(CrawlerTask).filter(CrawlerTask.id == task_id).first()
    if not task:
        return

    task.status = TaskStatus.RUNNING
    task.started_at = datetime.now(timezone.utc)
    db.commit()

    try:
        cookie = db.query(CrawlerCookie).filter(
            CrawlerCookie.user_id == task.user_id,
            CrawlerCookie.platform == task.platform,
        ).first()
        cookies_json = cookie.cookies_json if cookie else None

        if task.platform == "wechat":
            from app.crawlers.wechat_crawler import WeChatCrawler
            crawler = WeChatCrawler(cookies=cookies_json)
        elif task.platform == "x":
            from app.crawlers.x_crawler import XCrawler
            crawler = XCrawler(cookies=cookies_json)
        elif task.platform == "weibo":
            from app.crawlers.weibo_crawler import WeiboCrawler
            crawler = WeiboCrawler(cookies=cookies_json)
        elif task.platform == "xiaohongshu":
            from app.crawlers.xiaohongshu_crawler import XiaohongshuCrawler
            crawler = XiaohongshuCrawler(cookies=cookies_json)
        elif task.platform == "bilibili":
            from app.crawlers.bilibili_crawler import BilibiliCrawler
            crawler = BilibiliCrawler(cookies=cookies_json)
        else:
            raise ValueError(f"Unsupported platform: {task.platform}")

        articles = await crawler.crawl(task.target_url, limit=20)
        task.items_crawled = len(articles)

        imported = 0
        for article in articles:
            try:
                create_content_from_crawled(
                    db=db,
                    kb_id=task.knowledge_base_id,
                    platform=task.platform,
                    **article,
                )
                imported += 1
            except Exception:
                continue

        task.items_imported = imported
        task.status = TaskStatus.COMPLETED
        task.completed_at = datetime.now(timezone.utc)

    except Exception as e:
        task.status = TaskStatus.FAILED
        task.error_message = str(e)[:500]
        task.completed_at = datetime.now(timezone.utc)

    db.commit()


@router.post("/tasks", response_model=CrawlerTaskResponse, status_code=201)
def create_crawler_task(
    task_in: CrawlerTaskCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    kb = db.query(KnowledgeBase).filter(
        KnowledgeBase.id == task_in.knowledge_base_id,
        KnowledgeBase.user_id == current_user.id,
    ).first()
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    if task_in.platform not in ("wechat", "x", "weibo", "xiaohongshu", "bilibili"):
        raise HTTPException(status_code=400, detail="Unsupported platform")

    task = CrawlerTask(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        knowledge_base_id=task_in.knowledge_base_id,
        platform=task_in.platform,
        target_url=task_in.target_url,
        target_name=task_in.target_name,
        status=TaskStatus.PENDING,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    background_tasks.add_task(_run_crawler_task, task.id)
    return task


@router.get("/tasks", response_model=List[CrawlerTaskResponse])
def list_crawler_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(CrawlerTask)
        .filter(CrawlerTask.user_id == current_user.id)
        .order_by(CrawlerTask.created_at.desc())
        .all()
    )


@router.get("/tasks/{task_id}", response_model=CrawlerTaskResponse)
def get_crawler_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(CrawlerTask).filter(
        CrawlerTask.id == task_id,
        CrawlerTask.user_id == current_user.id,
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("/cookies", response_model=CrawlerCookieResponse, status_code=201)
def save_cookies(
    cookie_in: CrawlerCookieCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(CrawlerCookie).filter(
        CrawlerCookie.user_id == current_user.id,
        CrawlerCookie.platform == cookie_in.platform,
    ).delete()

    cookie = CrawlerCookie(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        platform=cookie_in.platform,
        cookies_json=cookie_in.cookies_json,
    )
    db.add(cookie)
    db.commit()
    db.refresh(cookie)
    return cookie


@router.get("/cookies", response_model=List[CrawlerCookieResponse])
def list_cookies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(CrawlerCookie)
        .filter(CrawlerCookie.user_id == current_user.id)
        .order_by(CrawlerCookie.created_at.desc())
        .all()
    )
