import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.knowledge_base import KnowledgeBase
from app.models.credit_transaction import CreditTransaction
from app.schemas.content_generation import ContentGenerationRequest, ContentGenerationResponse
from app.services.content_generation_service import generate_content

router = APIRouter()

CREDITS_PER_GENERATION = 50


@router.post("/generate", response_model=ContentGenerationResponse)
def generate_content_endpoint(
    request: ContentGenerationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.credits < CREDITS_PER_GENERATION:
        raise HTTPException(status_code=402, detail="Insufficient credits")

    kbs = db.query(KnowledgeBase).filter(
        KnowledgeBase.id.in_(request.knowledge_base_ids),
        KnowledgeBase.user_id == current_user.id,
    ).all()

    if len(kbs) != len(request.knowledge_base_ids):
        raise HTTPException(status_code=404, detail="Some knowledge bases not found")

    collection_names = [kb.qdrant_collection_name for kb in kbs if kb.qdrant_collection_name]

    result = generate_content(
        kb_collection_names=collection_names,
        topic=request.topic,
        content_type=request.content_type,
    )

    current_user.credits -= CREDITS_PER_GENERATION
    transaction = CreditTransaction(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        amount=-CREDITS_PER_GENERATION,
        transaction_type="content_generation",
        description=f"Generate {request.content_type}: {request.topic}",
    )
    db.add(transaction)
    db.commit()

    return ContentGenerationResponse(
        content=result["content"],
        outline=result["outline"],
        token_count=result["token_count"],
        credits_used=CREDITS_PER_GENERATION,
    )
