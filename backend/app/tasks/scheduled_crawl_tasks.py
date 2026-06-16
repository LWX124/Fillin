from app.core.celery_app import celery_app
from app.db.session import SessionLocal
from app.models.scheduled_crawl import ScheduledCrawl
from app.models.crawler_task import CrawlerTask, TaskStatus
from datetime import datetime, timedelta, timezone
import uuid


@celery_app.task
def check_scheduled_crawls():
    """Check and trigger scheduled crawls that are due."""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        due_crawls = db.query(ScheduledCrawl).filter(
            ScheduledCrawl.is_active == True,
            ScheduledCrawl.next_run_at <= now,
        ).all()

        for crawl in due_crawls:
            task = CrawlerTask(
                id=str(uuid.uuid4()),
                user_id=crawl.user_id,
                knowledge_base_id=crawl.knowledge_base_id,
                platform=crawl.platform,
                target_url=crawl.target_url,
                target_name=crawl.target_name,
                status=TaskStatus.PENDING,
            )
            db.add(task)
            crawl.last_run_at = now
            crawl.next_run_at = now + timedelta(hours=crawl.interval_hours)

        db.commit()
    finally:
        db.close()
