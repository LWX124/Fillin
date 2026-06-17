from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid

from app.db.session import get_db
from app.models.user import User
from app.schemas.user import (
    SUPPORTED_LOCALES,
    UserCreate,
    UserLogin,
    UserResponse,
    TokenResponse,
    TokenRefresh,
    UserPreferencesUpdate,
)
from app.core.security import (
    get_password_hash, verify_password,
    create_access_token, create_refresh_token, decode_token
)
from app.api.deps import get_current_user

router = APIRouter()


def api_error(status_code: int, code: str, detail: str) -> HTTPException:
    return HTTPException(status_code=status_code, detail={"code": code, "detail": detail})


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    if user_in.preferred_locale is not None and user_in.preferred_locale not in SUPPORTED_LOCALES:
        raise api_error(status_code=400, code="INVALID_LOCALE", detail="Unsupported locale")

    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise api_error(status_code=400, code="EMAIL_ALREADY_REGISTERED", detail="Email already registered")

    user = User(
        id=str(uuid.uuid4()),
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        username=user_in.username or user_in.email.split("@")[0],
        credits=100,
        preferred_locale=user_in.preferred_locale or "zh",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(data={"sub": user.id})
    refresh_token = create_refresh_token(data={"sub": user.id})
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/login", response_model=TokenResponse)
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.password_hash):
        raise api_error(status_code=401, code="INVALID_CREDENTIALS", detail="Invalid email or password")

    access_token = create_access_token(data={"sub": user.id})
    refresh_token = create_refresh_token(data={"sub": user.id})
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(token_in: TokenRefresh, db: Session = Depends(get_db)):
    payload = decode_token(token_in.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise api_error(status_code=401, code="INVALID_REFRESH_TOKEN", detail="Invalid refresh token")

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise api_error(status_code=401, code="USER_INACTIVE", detail="User not found or inactive")

    access_token = create_access_token(data={"sub": user.id})
    refresh_token = create_refresh_token(data={"sub": user.id})
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me/preferences", response_model=UserResponse)
def update_preferences(
    preferences: UserPreferencesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if preferences.preferred_locale not in SUPPORTED_LOCALES:
        raise api_error(status_code=400, code="INVALID_LOCALE", detail="Unsupported locale")

    current_user.preferred_locale = preferences.preferred_locale
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user
