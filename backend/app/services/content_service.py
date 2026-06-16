import uuid
from sqlalchemy.orm import Session
from app.models.content import Content
from app.models.knowledge_base import KnowledgeBase
from app.services.vectorization import vectorize_content, create_collection


def create_content_from_crawled(
    db: Session,
    kb_id: str,
    platform: str,
    title: str,
    content: str,
    url: str,
    published_at: str,
):
    existing = db.query(Content).filter(
        Content.knowledge_base_id == kb_id,
        Content.source_url == url,
    ).first()
    if existing:
        return existing

    item = Content(
        id=str(uuid.uuid4()),
        knowledge_base_id=kb_id,
        title=title,
        content=content,
        source_platform=platform,
        source_url=url,
    )
    db.add(item)

    kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id).first()
    if kb:
        kb.content_count = (kb.content_count or 0) + 1

    db.commit()
    db.refresh(item)

    # Best-effort vectorization
    try:
        if kb:
            create_collection(kb.qdrant_collection_name)
            vector_ids = vectorize_content(
                kb.qdrant_collection_name, item.id, item.title, item.content
            )
            item.is_vectorized = True
            item.vector_ids = vector_ids
            db.commit()
    except Exception:
        pass

    return item
