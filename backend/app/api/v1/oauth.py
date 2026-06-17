from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from authlib.integrations.starlette_client import OAuth
from starlette.requests import Request
import uuid

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token

router = APIRouter()

oauth = OAuth()

if settings.GOOGLE_CLIENT_ID:
    oauth.register(
        name="google",
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )


@router.get("/google/login")
async def google_login(request: Request):
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")
    redirect_uri = settings.GOOGLE_REDIRECT_URI
    locale = request.query_params.get("locale", "zh")
    if locale not in {"zh", "en"}:
        locale = "zh"
    request.session["oauth_locale"] = locale
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")

    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get("userinfo")
        if not user_info:
            raise HTTPException(status_code=400, detail="Failed to get user info")

        google_id = user_info["sub"]
        email = user_info["email"]
        username = user_info.get("name", email.split("@")[0])
        avatar_url = user_info.get("picture")
        locale = request.session.pop("oauth_locale", "zh")
        if locale not in {"zh", "en"}:
            locale = "zh"

        user = db.query(User).filter(User.google_id == google_id).first()

        if not user:
            user = db.query(User).filter(User.email == email).first()
            if user:
                user.google_id = google_id
                user.avatar_url = avatar_url
            else:
                user = User(
                    id=str(uuid.uuid4()),
                    email=email,
                    username=username,
                    google_id=google_id,
                    avatar_url=avatar_url,
                    password_hash="",
                    credits=100,
                    preferred_locale=locale,
                )
                db.add(user)
            db.commit()
            db.refresh(user)

        access_token = create_access_token(data={"sub": user.id})
        refresh_token = create_refresh_token(data={"sub": user.id})

        frontend_url = f"{settings.FRONTEND_URL}/{locale}/auth/callback#access_token={access_token}&refresh_token={refresh_token}"
        return RedirectResponse(url=frontend_url)

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"OAuth failed: {str(e)}")
