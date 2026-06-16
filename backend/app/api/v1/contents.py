import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.knowledge_base import KnowledgeBase
from app.models.content import Content
from app.schemas.content import ContentCreate, ContentResponse
from app.services.vectorization import vectorize_content, create_collection, delete_vectors

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post(
    "/{kb_id}/contents",
    response_model=ContentResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_content(
    kb_id: str,
    content_in: ContentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    kb = (
        db.query(KnowledgeBase)
        .filter(KnowledgeBase.id == kb_id, KnowledgeBase.user_id == current_user.id)
        .first()
    )
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    item = Content(
        id=str(uuid.uuid4()),
        knowledge_base_id=kb_id,
        title=content_in.title,
        content=content_in.content,
        source_platform=content_in.source_platform,
        source_url=content_in.source_url,
    )
    db.add(item)
    kb.content_count = (kb.content_count or 0) + 1
    db.commit()
    db.refresh(item)

    # Vectorize asynchronously (best-effort, don't block on failure)
    try:
        create_collection(kb.qdrant_collection_name)
        vector_ids = vectorize_content(
            kb.qdrant_collection_name, item.id, item.title, item.content
        )
        item.is_vectorized = True
        item.vector_ids = vector_ids
        db.commit()
        db.refresh(item)
    except Exception:
        logger.warning("Vectorization failed for content %s", item.id, exc_info=True)

    return item


@router.get("/{kb_id}/contents", response_model=List[ContentResponse])
def list_contents(
    kb_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    kb = (
        db.query(KnowledgeBase)
        .filter(KnowledgeBase.id == kb_id, KnowledgeBase.user_id == current_user.id)
        .first()
    )
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    return (
        db.query(Content)
        .filter(Content.knowledge_base_id == kb_id)
        .order_by(Content.created_at.desc())
        .all()
    )


@router.get("/{kb_id}/contents/{content_id}", response_model=ContentResponse)
def get_content(
    kb_id: str,
    content_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    kb = (
        db.query(KnowledgeBase)
        .filter(KnowledgeBase.id == kb_id, KnowledgeBase.user_id == current_user.id)
        .first()
    )
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    item = (
        db.query(Content)
        .filter(Content.id == content_id, Content.knowledge_base_id == kb_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Content not found")
    return item


@router.delete("/{kb_id}/contents/{content_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_content(
    kb_id: str,
    content_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    kb = (
        db.query(KnowledgeBase)
        .filter(KnowledgeBase.id == kb_id, KnowledgeBase.user_id == current_user.id)
        .first()
    )
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    item = (
        db.query(Content)
        .filter(Content.id == content_id, Content.knowledge_base_id == kb_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Content not found")

    db.delete(item)
    kb.content_count = max((kb.content_count or 1) - 1, 0)

    # Remove vectors from Qdrant
    if item.vector_ids:
        try:
            delete_vectors(kb.qdrant_collection_name, item.vector_ids)
        except Exception:
            pass

    db.commit()
    return None
