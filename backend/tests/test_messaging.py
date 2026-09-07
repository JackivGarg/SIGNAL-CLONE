from uuid import uuid4

from fastapi.testclient import TestClient


def login(client: TestClient, identifier: str) -> dict[str, object]:
    response = client.post(f"/api/auth/demo-login/{identifier}")
    assert response.status_code == 200
    return response.json()


def test_send_message_is_persistent_and_idempotent(client: TestClient) -> None:
    current_user = login(client, "jack")
    conversations = client.get("/api/conversations").json()
    direct = next(item for item in conversations if item["kind"] == "direct")
    client_message_id = str(uuid4())
    payload = {
        "body": "A message from the integration test",
        "client_message_id": client_message_id,
    }

    first_response = client.post(
        f"/api/conversations/{direct['id']}/messages", json=payload
    )
    repeated_response = client.post(
        f"/api/conversations/{direct['id']}/messages", json=payload
    )

    assert first_response.status_code == 201
    assert repeated_response.status_code == 200
    assert first_response.json()["id"] == repeated_response.json()["id"]
    assert first_response.json()["sender_id"] == current_user["id"]

    messages = client.get(f"/api/conversations/{direct['id']}/messages").json()
    matching_messages = [
        item for item in messages if item["client_message_id"] == client_message_id
    ]
    assert len(matching_messages) == 1


def test_message_timestamps_are_returned_as_utc(client: TestClient) -> None:
    login(client, "jack")
    conversation = client.get("/api/conversations").json()[0]
    assert conversation["last_message_at"].endswith("Z")
    assert conversation["last_message"]["sent_at"].endswith("Z")

    messages = client.get(f"/api/conversations/{conversation['id']}/messages").json()
    assert messages[-1]["sent_at"].endswith("Z")


def test_group_admin_can_promote_member_and_last_admin_is_protected(
    client: TestClient,
) -> None:
    current_user = login(client, "jack")
    conversations = client.get("/api/conversations").json()
    group = next(item for item in conversations if item["kind"] == "group")
    members = client.get(f"/api/conversations/{group['id']}/members").json()
    member = next(item for item in members if item["role"] == "member")

    last_admin_response = client.patch(
        f"/api/conversations/{group['id']}/members/{current_user['id']}",
        json={"role": "member"},
    )
    assert last_admin_response.status_code == 400
    assert "at least one admin" in last_admin_response.json()["detail"]

    promote_response = client.patch(
        f"/api/conversations/{group['id']}/members/{member['user_id']}",
        json={"role": "admin"},
    )
    assert promote_response.status_code == 200
    assert promote_response.json()["role"] == "admin"

    demote_self_response = client.patch(
        f"/api/conversations/{group['id']}/members/{current_user['id']}",
        json={"role": "member"},
    )
    assert demote_self_response.status_code == 200


def test_non_admin_cannot_remove_group_member(client: TestClient) -> None:
    login(client, "ava")
    conversations = client.get("/api/conversations").json()
    group = next(item for item in conversations if item["kind"] == "group")
    members = client.get(f"/api/conversations/{group['id']}/members").json()
    target = next(item for item in members if item["display_name"] == "Liam Wilson")

    response = client.delete(
        f"/api/conversations/{group['id']}/members/{target['user_id']}"
    )
    assert response.status_code == 403
