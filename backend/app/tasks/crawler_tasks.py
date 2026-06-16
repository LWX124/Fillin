from app.core.celery_app import celery_app
from app.db.session import SessionLocal
from app.models.crawler_task import CrawlerTask, TaskStatus
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)


@celery_app.task
def process_pending_tasks():
    db = SessionLocal()
    try:
        pending = (
            db.query(CrawlerTask)
            .filter(CrawlerTask.status == TaskStatus.PENDING)
            .limit(5)
            .all()
        )
        for task in pending:
            _execute_crawler_sync(task.id, db)
    finally:
        db.close()


def _execute_crawler_sync(task_id: str, db):
    from app.services.content_service import create_content_from_crawled
    from app.models.crawler_cookie import CrawlerCookie
    import httpx

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

        with httpx.Client(timeout=30) as client:
            articles = crawler.crawl_sync(client, task.target_url, limit=20)

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
        logger.warning("Crawler task %s failed: %s", task_id, str(e))
        task.status = TaskStatus.FAILED
        task.error_message = str(e)[:500]
        task.completed_at = datetime.now(timezone.utc)

    db.commit()
