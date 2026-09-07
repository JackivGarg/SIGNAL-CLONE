from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session as DbSession

from app.core.config import get_settings
from app.core.database import get_db
from app.models.user import User
from app.services.auth import get_user_for_session_token

DatabaseSession = Annotated[DbSession, Depends(get_db)]


def get_current_user(request: Request, db: DatabaseSession) -> User:
    settings = get_settings()
    user = get_user_for_session_token(db, request.cookies.get(settings.session_cookie_name))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication is required.",
        )
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
