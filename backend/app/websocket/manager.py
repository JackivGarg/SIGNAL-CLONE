"""In-memory connection registry for the single application worker."""

from collections import defaultdict

from fastapi import WebSocket


class ConnectionManager:
    """Track authenticated sockets and send events to a user's active clients."""

    def __init__(self) -> None:
        self._connections: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections[user_id].add(websocket)

    def disconnect(self, user_id: str, websocket: WebSocket) -> None:
        connections = self._connections.get(user_id)
        if connections is None:
            return
        connections.discard(websocket)
        if not connections:
            self._connections.pop(user_id, None)

    def is_connected(self, user_id: str) -> bool:
        return bool(self._connections.get(user_id))

    async def send_to_user(self, user_id: str, event: dict[str, object]) -> None:
        """Deliver an event to every active device for a user.

        A failed send only means that one stale socket is removed; it must not
        interrupt the REST action that already persisted the event.
        """

        for websocket in tuple(self._connections.get(user_id, set())):
            try:
                await websocket.send_json(event)
            except RuntimeError:
                self.disconnect(user_id, websocket)


connection_manager = ConnectionManager()
