from fastapi.testclient import TestClient

from app.main import app


def register_user(client: TestClient, identifier: str, display_name: str) -> dict[str, object]:
    challenge = client.post("/api/auth/request-otp", json={"identifier": identifier}).json()
    response = client.post(
        "/api/auth/verify-otp",
        json={"challenge_id": challenge["challenge_id"], "code": "123456"},
    )
    assert response.status_code == 200
    profile = client.patch(
        "/api/auth/profile",
        json={"display_name": display_name, "avatar_key": "sky", "bio": ""},
    )
    assert profile.status_code == 200
    return profile.json()


def test_new_direct_conversation_is_pushed_to_online_recipient(client: TestClient) -> None:
    recipient = TestClient(app)
    sender_user = register_user(client, "event-sender", "Event Sender")
    recipient_user = register_user(recipient, "event-recipient", "Event Recipient")

    with recipient.websocket_connect("/ws") as socket:
        assert socket.receive_json()["type"] == "connection.ready"
        response = client.post(
            "/api/conversations/direct", json={"user_id": recipient_user["id"]}
        )
        assert response.status_code == 201
        event = socket.receive_json()

    assert sender_user["id"] != recipient_user["id"]
    assert event["type"] == "conversation.created"
    assert event["conversation"]["kind"] == "direct"
    assert event["conversation"]["title"] == "Event Sender"


def test_new_group_is_pushed_to_online_member(client: TestClient) -> None:
    recipient = TestClient(app)
    register_user(client, "group-sender", "Group Sender")
    recipient_user = register_user(recipient, "group-recipient", "Group Recipient")

    with recipient.websocket_connect("/ws") as socket:
        assert socket.receive_json()["type"] == "connection.ready"
        response = client.post(
            "/api/conversations/groups",
            json={"title": "Live Project Group", "member_ids": [recipient_user["id"]]},
        )
        assert response.status_code == 201
        event = socket.receive_json()

    assert event["type"] == "conversation.created"
    assert event["conversation"]["kind"] == "group"
    assert event["conversation"]["title"] == "Live Project Group"
