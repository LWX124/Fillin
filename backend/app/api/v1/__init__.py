from fastapi import APIRouter
from app.api.v1 import auth, knowledge_bases, contents, conversations, chat, credits, crawler, scheduled_crawl, content_generation, oauth, tags, import_export, settings

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(oauth.router, prefix="/auth", tags=["auth"])
api_router.include_router(knowledge_bases.router, prefix="/knowledge-bases", tags=["knowledge-bases"])
api_router.include_router(contents.router, prefix="/knowledge-bases", tags=["contents"])
api_router.include_router(conversations.router, prefix="/conversations", tags=["conversations"])
api_router.include_router(chat.router, prefix="/conversations", tags=["chat"])
api_router.include_router(credits.router, prefix="/credits", tags=["credits"])
api_router.include_router(crawler.router, prefix="/crawlers", tags=["crawlers"])
api_router.include_router(scheduled_crawl.router, prefix="/crawlers", tags=["crawlers"])
api_router.include_router(content_generation.router, prefix="/content-generation", tags=["content-generation"])
api_router.include_router(tags.router, tags=["tags"])
api_router.include_router(import_export.router, tags=["import-export"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
