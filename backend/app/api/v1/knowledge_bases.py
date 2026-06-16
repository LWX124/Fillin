import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.knowledge_base import KnowledgeBase
from app.schemas.knowledge_base import (
    KnowledgeBaseCreate,
    KnowledgeBaseUpdate,
    KnowledgeBaseResponse,
)
from app.services.vectorization import delete_collection

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/", response_model=KnowledgeBaseResponse, status_code=status.HTTP_201_CREATED)
def create_knowledge_base(
    kb_in: KnowledgeBaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    kb = KnowledgeBase(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        name=kb_in.name,
        description=kb_in.description,
        qdrant_collection_name=f"kb_{uuid.uuid4().hex[:12]}",
    )
    db.add(kb)
    db.commit()
    db.refresh(kb)
    return kb


@router.get("/", response_model=List[KnowledgeBaseResponse])
def list_knowledge_bases(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(KnowledgeBase)
        .filter(KnowledgeBase.user_id == current_user.id)
        .order_by(KnowledgeBase.created_at.desc())
        .all()
    )


@router.get("/{kb_id}", response_model=KnowledgeBaseResponse)
def get_knowledge_base(
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
    return kb


@router.put("/{kb_id}", response_model=KnowledgeBaseResponse)
def update_knowledge_base(
    kb_id: str,
    kb_in: KnowledgeBaseUpdate,
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
    if kb_in.name is not None:
        kb.name = kb_in.name
    if kb_in.description is not None:
        kb.description = kb_in.description
    db.commit()
    db.refresh(kb)
    return kb


@router.delete("/{kb_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_knowledge_base(
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

    collection_name = kb.qdrant_collection_name
    db.delete(kb)
    db.commit()

    if collection_name:
        try:
            delete_collection(collection_name)
        except Exception:
            logger.warning("Failed to delete Qdrant collection %s", collection_name)

    return None
