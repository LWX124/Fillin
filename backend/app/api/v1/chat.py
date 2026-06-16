import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from openai import OpenAI

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.knowledge_base import KnowledgeBase
from app.models.credit_transaction import CreditTransaction
from app.services.vectorization import search_similar
from app.core.config import settings
from pydantic import BaseModel
from typing import List

router = APIRouter()

CREDITS_PER_QUERY = 1


class ChatRequest(BaseModel):
    content: str


class ChatResponse(BaseModel):
    answer: str
    sources: List[dict]
    credits_used: int


@router.post("/{conv_id}/chat", response_model=ChatResponse)
def chat(
    conv_id: str,
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = db.query(Conversation).filter(
        Conversation.id == conv_id, Conversation.user_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if current_user.credits < CREDITS_PER_QUERY:
        raise HTTPException(status_code=402, detail="Insufficient credits")

    # Atomic credit deduction before LLM call
    from sqlalchemy import text
    result = db.execute(
        text("UPDATE users SET credits = credits - :cost WHERE id = :uid AND credits >= :cost"),
        {"cost": CREDITS_PER_QUERY, "uid": current_user.id},
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=402, detail="Insufficient credits")
    db.commit()
    db.refresh(current_user)

    # Retrieve relevant chunks from all linked knowledge bases
    all_sources = []
    for kb_id in conv.knowledge_base_ids:
        kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id).first()
        if kb and kb.qdrant_collection_name:
            try:
                results = search_similar(kb.qdrant_collection_name, req.content, limit=3)
                all_sources.extend(results)
            except Exception:
                pass

    all_sources.sort(key=lambda x: x["score"], reverse=True)
    top_sources = all_sources[:5]

    context = "\n\n".join([s["text"] for s in top_sources]) if top_sources else ""

    # Build messages for LLM
    history = (
        db.query(Message)
        .filter(Message.conversation_id == conv_id)
        .order_by(Message.created_at.desc())
        .limit(10)
        .all()
    )
    history.reverse()

    messages = [
        {
            "role": "system",
            "content": (
                "You are a helpful assistant that answers questions based on the provided context. "
                "If the context doesn't contain relevant information, say so honestly. "
                "Always cite which part of the context you're referencing."
            ),
        }
    ]

    for msg in history:
        messages.append({"role": msg.role, "content": msg.content})

    if context:
        messages.append({
            "role": "user",
            "content": f"Context:\n{context}\n\nQuestion: {req.content}",
        })
    else:
        messages.append({"role": "user", "content": req.content})

    # Call LLM (DeepSeek via OpenAI-compatible API)
    client = OpenAI(
        api_key=settings.OPENAI_API_KEY,
        base_url=settings.LLM_BASE_URL,
    )
    completion = client.chat.completions.create(
        model=settings.LLM_MODEL,
        messages=messages,
        max_tokens=1024,
    )
    answer = completion.choices[0].message.content

    # Save user message
    user_msg = Message(
        id=str(uuid.uuid4()),
        conversation_id=conv_id,
        role="user",
        content=req.content,
        credits_used=0,
    )
    db.add(user_msg)

    # Save assistant message
    assistant_msg = Message(
        id=str(uuid.uuid4()),
        conversation_id=conv_id,
        role="assistant",
        content=answer,
        sources={"references": top_sources},
        token_count=completion.usage.total_tokens if completion.usage else 0,
        credits_used=CREDITS_PER_QUERY,
    )
    db.add(assistant_msg)

    transaction = CreditTransaction(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        amount=-CREDITS_PER_QUERY,
        transaction_type="consumption",
        description="RAG query",
        related_entity_type="conversation",
        related_entity_id=conv_id,
    )
    db.add(transaction)
    db.commit()

    return ChatResponse(
        answer=answer,
        sources=top_sources,
        credits_used=CREDITS_PER_QUERY,
    )
