from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "fillin",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "process-pending-crawler-tasks": {
            "task": "app.tasks.crawler_tasks.process_pending_tasks",
            "schedule": 60.0,
        },
        "check-scheduled-crawls": {
            "task": "app.tasks.scheduled_crawl_tasks.check_scheduled_crawls",
            "schedule": 300.0,
        },
    },
)
