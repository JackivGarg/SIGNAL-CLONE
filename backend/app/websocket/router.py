"""Authenticated WebSocket endpoint used by the conversation client."""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.services.auth import get_user_for_session_token
from app.websocket.manager import connection_manager

router = APIRouter()


@router.websocket("")
async def connect_websocket(websocket: WebSocket) -> None:
    """Keep an authenticated client connected and answer heartbeat pings."""

    settings = get_settings()
    session_token = websocket.cookies.get(settings.session_cookie_name)
    with SessionLocal() as db:
        user = get_user_for_session_token(db, session_token)

    if user is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id = user.id
    await connection_manager.connect(user_id, websocket)
    await websocket.send_json({"type": "connection.ready", "user_id": user_id})

    try:
        while True:
            event = await websocket.receive_json()
            if event.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        pass
    finally:
        connection_manager.disconnect(user_id, websocket)
