from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.auth import router as auth_router
from app.api.contacts import router as contacts_router
from app.api.conversations import router as conversations_router
from app.api.health import router as health_router
from app.core.config import get_settings
from app.websocket.router import router as websocket_router


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Signal Clone API",
        version="0.1.0",
        description="REST and WebSocket service for the Signal Clone assignment.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(auth_router, prefix="/api")
    app.include_router(contacts_router, prefix="/api")
    app.include_router(conversations_router, prefix="/api")
    app.include_router(health_router, prefix="/api")
    app.include_router(websocket_router, prefix="/ws")
    if settings.static_directory_path:
        app.mount(
            "/",
            StaticFiles(directory=settings.static_directory_path, html=True),
            name="frontend",
        )
    return app


app = create_app()
