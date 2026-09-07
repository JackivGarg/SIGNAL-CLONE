from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DatabaseSession
from app.core.config import get_settings
from app.models.user import User
from app.schemas.user import UserResponse
from app.services.auth import create_session

router = APIRouter(prefix="/auth", tags=["authentication"])


def set_session_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        max_age=settings.session_duration_days * 24 * 60 * 60,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
        path="/",
    )


@router.get("/demo-users", response_model=list[UserResponse])
def list_demo_users(db: DatabaseSession) -> list[User]:
    return list(
        db.scalars(select(User).where(User.is_demo_user.is_(True)).order_by(User.display_name)).all()
    )


@router.post("/demo-login/{identifier}", response_model=UserResponse)
def login_as_demo_user(identifier: str, response: Response, db: DatabaseSession) -> User:
    settings = get_settings()
    if not settings.demo_mode:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Demo mode is disabled.")

    user = db.scalar(
        select(User).where(
            User.identifier == identifier.strip().lower(), User.is_demo_user.is_(True)
        )
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Demo account was not found."
        )

    set_session_cookie(response, create_session(db, user))
    return user


@router.get("/me", response_model=UserResponse)
def get_me(current_user: CurrentUser) -> User:
    return current_user
