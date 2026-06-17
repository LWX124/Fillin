from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

SUPPORTED_LOCALES = {"zh", "en"}


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    username: Optional[str] = None
    preferred_locale: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    username: Optional[str]
    credits: int
    preferred_locale: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    refresh_token: str


class UserPreferencesUpdate(BaseModel):
    preferred_locale: str
