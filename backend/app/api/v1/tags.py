import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.tag import Tag
from app.models.content_tag import ContentTag
from app.models.content import Content
from app.models.knowledge_base import KnowledgeBase
from app.schemas.tag import TagCreate, TagResponse, AddTagsToContentRequest

router = APIRouter()


@router.post("/tags", response_model=TagResponse, status_code=201)
def create_tag(
    tag_in: TagCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.query(Tag).filter(
        Tag.user_id == current_user.id,
        Tag.name == tag_in.name,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tag already exists")

    tag = Tag(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        name=tag_in.name,
        color=tag_in.color,
    )
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@router.get("/tags", response_model=List[TagResponse])
def list_tags(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Tag).filter(Tag.user_id == current_user.id).order_by(Tag.name).all()


@router.delete("/tags/{tag_id}", status_code=204)
def delete_tag(
    tag_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tag = db.query(Tag).filter(Tag.id == tag_id, Tag.user_id == current_user.id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    db.delete(tag)
    db.commit()
    return None


@router.post("/contents/{content_id}/tags", status_code=201)
def add_tags_to_content(
    content_id: str,
    request: AddTagsToContentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content = db.query(Content).filter(Content.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    kb = db.query(KnowledgeBase).filter(
        KnowledgeBase.id == content.knowledge_base_id,
        KnowledgeBase.user_id == current_user.id,
    ).first()
    if not kb:
        raise HTTPException(status_code=404, detail="Content not found")

    tags = db.query(Tag).filter(
        Tag.id.in_(request.tag_ids),
        Tag.user_id == current_user.id,
    ).all()
    if len(tags) != len(request.tag_ids):
        raise HTTPException(status_code=404, detail="Some tags not found")

    db.query(ContentTag).filter(ContentTag.content_id == content_id).delete()

    for tag in tags:
        ct = ContentTag(id=str(uuid.uuid4()), content_id=content_id, tag_id=tag.id)
        db.add(ct)

    db.commit()
    return {"message": "Tags updated"}


@router.get("/contents/{content_id}/tags", response_model=List[TagResponse])
def get_content_tags(
    content_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content = db.query(Content).filter(Content.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    kb = db.query(KnowledgeBase).filter(
        KnowledgeBase.id == content.knowledge_base_id,
        KnowledgeBase.user_id == current_user.id,
    ).first()
    if not kb:
        raise HTTPException(status_code=404, detail="Content not found")

    return db.query(Tag).join(ContentTag).filter(ContentTag.content_id == content_id).all()
