"""Authenticated WebSocket endpoint used by the conversation client."""

import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.models.contact import Contact
from app.models.conversation import ConversationMember
from app.services.auth import get_user_for_session_token
from app.services.conversations import get_member_conversation
from app.websocket.manager import connection_manager

router = APIRouter()


@router.websocket("")
async def connect_websocket(websocket: WebSocket) -> None:
    """Keep an authenticated client connected and answer heartbeat pings."""

    settings = get_settings()
    session_token = websocket.cookies.get(settings.session_cookie_name)
    with SessionLocal() as db:
        user = get_user_for_session_token(db, session_token)
        contact_ids = (
            list(db.scalars(select(Contact.contact_id).where(Contact.owner_id == user.id)).all())
            if user
            else []
        )

    if user is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id = user.id
    was_online = connection_manager.is_connected(user_id)
    await connection_manager.connect(user_id, websocket)
    online_contact_ids = [
        contact_id for contact_id in contact_ids if connection_manager.is_connected(contact_id)
    ]
    await websocket.send_json(
        {
            "type": "connection.ready",
            "user_id": user_id,
            "online_contact_ids": online_contact_ids,
        }
    )
    if not was_online:
        asyncio.create_task(
            connection_manager.send_to_users(
                contact_ids,
                {"type": "presence.updated", "user_id": user_id, "is_online": True},
            )
        )

    try:
        while True:
            event = await websocket.receive_json()
            if not isinstance(event, dict):
                continue
            if event.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
            elif event.get("type") in {"typing.started", "typing.stopped"}:
                conversation_id = event.get("conversation_id")
                if not isinstance(conversation_id, str):
                    continue
                with SessionLocal() as db:
                    conversation = get_member_conversation(db, conversation_id, user_id)
                    if conversation is None:
                        continue
                    recipient_ids = list(
                        db.scalars(
                            select(ConversationMember.user_id).where(
                                ConversationMember.conversation_id == conversation.id,
                                ConversationMember.user_id != user_id,
                            )
                        ).all()
                    )
                await connection_manager.send_to_users(
                    recipient_ids,
                    {
                        "type": event["type"],
                        "conversation_id": conversation_id,
                        "user_id": user_id,
                    },
                )
    except WebSocketDisconnect:
        pass
    finally:
        connection_manager.disconnect(user_id, websocket)
        if not connection_manager.is_connected(user_id):
            asyncio.create_task(
                connection_manager.send_to_users(
                    contact_ids,
                    {"type": "presence.updated", "user_id": user_id, "is_online": False},
                )
            )
