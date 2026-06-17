from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import decode_token
from app.models.user import User

security = HTTPBearer(auto_error=False)


def api_error(status_code: int, code: str, detail: str) -> HTTPException:
    return HTTPException(status_code=status_code, detail={"code": code, "detail": detail})


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    if not credentials:
        raise api_error(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="INVALID_TOKEN",
            detail="Invalid or expired token",
        )

    token = credentials.credentials
    payload = decode_token(token)
    
    if not payload or payload.get("type") != "access":
        raise api_error(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="INVALID_TOKEN",
            detail="Invalid or expired token",
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise api_error(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="INVALID_TOKEN_PAYLOAD",
            detail="Invalid token payload",
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise api_error(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="USER_INACTIVE",
            detail="User not found or inactive",
        )
    
    return user
