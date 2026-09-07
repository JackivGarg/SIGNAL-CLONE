from fastapi import FastAPI

from app.api.auth import router as auth_router
from app.api.contacts import router as contacts_router
from app.api.conversations import router as conversations_router
from app.api.health import router as health_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="Signal Clone API",
        version="0.1.0",
        description="REST and WebSocket service for the Signal Clone assignment.",
    )
    app.include_router(auth_router, prefix="/api")
    app.include_router(contacts_router, prefix="/api")
    app.include_router(conversations_router, prefix="/api")
    app.include_router(health_router, prefix="/api")
    return app


app = create_app()
