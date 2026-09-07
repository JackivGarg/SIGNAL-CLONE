from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


def register_user(
    client: TestClient, username: str, phone_number: str, display_name: str
) -> dict[str, object]:
    challenge = client.post(
        "/api/auth/request-otp",
        json={"phone_number": phone_number, "username": username},
    ).json()
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


def test_first_direct_message_reveals_conversation_to_online_recipient(
    client: TestClient,
) -> None:
    recipient = TestClient(app)
    sender_user = register_user(client, "event-sender", "+15550000101", "Event Sender")
    recipient_user = register_user(
        recipient, "event-recipient", "+15550000102", "Event Recipient"
    )

    with recipient.websocket_connect("/ws") as socket:
        assert socket.receive_json()["type"] == "connection.ready"
        response = client.post(
            "/api/conversations/direct", json={"user_id": recipient_user["id"]}
        )
        assert response.status_code == 201
        assert client.get("/api/conversations").status_code == 200
        assert recipient.get("/api/conversations").json() == []

        message_response = client.post(
            f"/api/conversations/{response.json()['id']}/messages",
            json={"body": "Now the chat should appear", "client_message_id": str(uuid4())},
        )
        assert message_response.status_code == 201
        event = socket.receive_json()

    assert sender_user["id"] != recipient_user["id"]
    assert event["type"] == "message.created"
    visible_conversations = recipient.get("/api/conversations").json()
    assert len(visible_conversations) == 1
    assert visible_conversations[0]["title"] == "Event Sender"


def test_new_group_is_pushed_to_online_member(client: TestClient) -> None:
    recipient = TestClient(app)
    register_user(client, "group-sender", "+15550000103", "Group Sender")
    recipient_user = register_user(
        recipient, "group-recipient", "+15550000104", "Group Recipient"
    )

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
