import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.user_api_key import UserAPIKey

router = APIRouter()


class APIKeyCreate(BaseModel):
    provider: str
    api_key: str


class APIKeyResponse(BaseModel):
    id: str
    provider: str
    api_key_preview: str
    is_active: bool
    created_at: datetime


@router.post("/api-keys", response_model=APIKeyResponse, status_code=201)
def create_api_key(
    key_in: APIKeyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(UserAPIKey).filter(
        UserAPIKey.user_id == current_user.id,
        UserAPIKey.provider == key_in.provider,
    ).delete()

    api_key = UserAPIKey(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        provider=key_in.provider,
        api_key=key_in.api_key,
    )
    db.add(api_key)
    db.commit()
    db.refresh(api_key)

    return APIKeyResponse(
        id=api_key.id,
        provider=api_key.provider,
        api_key_preview="****" + api_key.api_key[-4:],
        is_active=api_key.is_active,
        created_at=api_key.created_at,
    )


@router.get("/api-keys", response_model=List[APIKeyResponse])
def list_api_keys(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    keys = db.query(UserAPIKey).filter(UserAPIKey.user_id == current_user.id).all()
    return [
        APIKeyResponse(
            id=k.id,
            provider=k.provider,
            api_key_preview="****" + k.api_key[-4:],
            is_active=k.is_active,
            created_at=k.created_at,
        )
        for k in keys
    ]


@router.delete("/api-keys/{key_id}", status_code=204)
def delete_api_key(
    key_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    key = db.query(UserAPIKey).filter(
        UserAPIKey.id == key_id,
        UserAPIKey.user_id == current_user.id,
    ).first()
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    db.delete(key)
    db.commit()
    return None
