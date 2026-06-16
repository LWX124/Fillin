import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.knowledge_base import KnowledgeBase
from app.services.vectorization import search_similar

router = APIRouter()


class ConversationCreate(BaseModel):
    title: str = "New Conversation"
    knowledge_base_ids: List[str]


class ConversationResponse(BaseModel):
    id: str
    title: str
    knowledge_base_ids: List[str]
    created_at: datetime

    class Config:
        from_attributes = True


class MessageCreate(BaseModel):
    content: str


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    sources: dict | None = None
    credits_used: int
    created_at: datetime

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    content: str


class ChatResponse(BaseModel):
    answer: str
    sources: List[dict]
    credits_used: int


@router.post("/", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def create_conversation(
    conv_in: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    for kb_id in conv_in.knowledge_base_ids:
        kb = db.query(KnowledgeBase).filter(
            KnowledgeBase.id == kb_id, KnowledgeBase.user_id == current_user.id
        ).first()
        if not kb:
            raise HTTPException(status_code=404, detail=f"Knowledge base {kb_id} not found")

    conv = Conversation(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        title=conv_in.title,
        knowledge_base_ids=conv_in.knowledge_base_ids,
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv


@router.get("/", response_model=List[ConversationResponse])
def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Conversation)
        .filter(Conversation.user_id == current_user.id)
        .order_by(Conversation.updated_at.desc())
        .all()
    )


@router.get("/{conv_id}", response_model=ConversationResponse)
def get_conversation(
    conv_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = db.query(Conversation).filter(
        Conversation.id == conv_id, Conversation.user_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv


@router.get("/{conv_id}/messages", response_model=List[MessageResponse])
def list_messages(
    conv_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = db.query(Conversation).filter(
        Conversation.id == conv_id, Conversation.user_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return (
        db.query(Message)
        .filter(Message.conversation_id == conv_id)
        .order_by(Message.created_at.asc())
        .all()
    )


@router.delete("/{conv_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(
    conv_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = db.query(Conversation).filter(
        Conversation.id == conv_id, Conversation.user_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.query(Message).filter(Message.conversation_id == conv_id).delete()
    db.delete(conv)
    db.commit()
    return None
