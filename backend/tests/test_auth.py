from fastapi.testclient import TestClient


def test_demo_login_and_logout(client: TestClient) -> None:
    users_response = client.get("/api/auth/demo-users")
    assert users_response.status_code == 200
    assert len(users_response.json()) == 4

    login_response = client.post("/api/auth/demo-login/jack")
    assert login_response.status_code == 200
    assert login_response.json()["display_name"] == "Jack"
    assert client.get("/api/auth/me").status_code == 200

    logout_response = client.post("/api/auth/logout")
    assert logout_response.status_code == 204
    assert client.get("/api/auth/me").status_code == 401


def test_mock_otp_registration_and_profile_setup(client: TestClient) -> None:
    challenge_response = client.post(
        "/api/auth/request-otp",
        json={"phone_number": "+15550000001", "username": "new-reviewer"},
    )
    assert challenge_response.status_code == 200
    challenge = challenge_response.json()
    assert challenge["demo_code"] == "123456"

    verify_response = client.post(
        "/api/auth/verify-otp",
        json={"challenge_id": challenge["challenge_id"], "code": "123456"},
    )
    assert verify_response.status_code == 200
    assert verify_response.json()["is_profile_complete"] is False

    profile_response = client.patch(
        "/api/auth/profile",
        json={"display_name": "New Reviewer", "avatar_key": "sky", "bio": "Hello"},
    )
    assert profile_response.status_code == 200
    assert profile_response.json()["display_name"] == "New Reviewer"
    assert profile_response.json()["is_profile_complete"] is True


def test_private_routes_require_authentication(client: TestClient) -> None:
    assert client.get("/api/conversations").status_code == 401
    assert client.get("/api/contacts").status_code == 401


def test_registered_phone_user_can_be_found_and_added_as_a_contact(client: TestClient) -> None:
    target_challenge = client.post(
        "/api/auth/request-otp",
        json={"phone_number": "+15551234567", "username": "comate"},
    ).json()
    assert client.post(
        "/api/auth/verify-otp",
        json={"challenge_id": target_challenge["challenge_id"], "code": "123456"},
    ).status_code == 200
    assert client.patch(
        "/api/auth/profile",
        json={"display_name": "Comate Friend", "avatar_key": "sky", "bio": ""},
    ).status_code == 200
    assert client.post("/api/auth/logout").status_code == 204

    requester_challenge = client.post(
        "/api/auth/request-otp",
        json={"phone_number": "+15557654321", "username": "phone-requester"},
    ).json()
    assert client.post(
        "/api/auth/verify-otp",
        json={"challenge_id": requester_challenge["challenge_id"], "code": "123456"},
    ).status_code == 200
    assert client.patch(
        "/api/auth/profile",
        json={"display_name": "Phone Requester", "avatar_key": "forest", "bio": ""},
    ).status_code == 200

    add_response = client.post("/api/contacts", json={"identifier": " +15551234567 "})
    assert add_response.status_code == 201
    assert add_response.json()["identifier"] == "comate"
    username_response = client.post("/api/contacts", json={"identifier": "COMATE"})
    assert username_response.status_code == 201
    assert username_response.json()["phone_number"] == "+15551234567"
    display_name_response = client.post(
        "/api/contacts", json={"identifier": "Comate Friend"}
    )
    assert display_name_response.status_code == 404
    contacts_response = client.get("/api/contacts?query=1234567")
    assert contacts_response.status_code == 200
    assert [contact["identifier"] for contact in contacts_response.json()] == ["comate"]


def test_registration_requires_unique_phone_and_username(client: TestClient) -> None:
    missing_username = client.post(
        "/api/auth/request-otp", json={"phone_number": "+15550000002"}
    )
    assert missing_username.status_code == 422

    duplicate_username = client.post(
        "/api/auth/request-otp",
        json={"phone_number": "+15550000002", "username": "jack"},
    )
    assert duplicate_username.status_code == 409


def test_registered_user_can_sign_in_again_with_matching_phone_and_username(
    client: TestClient,
) -> None:
    credentials = {"phone_number": "+15550000003", "username": "returning-user"}
    first_challenge = client.post("/api/auth/request-otp", json=credentials).json()
    first_login = client.post(
        "/api/auth/verify-otp",
        json={"challenge_id": first_challenge["challenge_id"], "code": "123456"},
    )
    assert first_login.status_code == 200
    user_id = first_login.json()["id"]
    assert client.post("/api/auth/logout").status_code == 204

    second_challenge_response = client.post("/api/auth/request-otp", json=credentials)
    assert second_challenge_response.status_code == 200
    second_login = client.post(
        "/api/auth/verify-otp",
        json={
            "challenge_id": second_challenge_response.json()["challenge_id"],
            "code": "123456",
        },
    )
    assert second_login.status_code == 200
    assert second_login.json()["id"] == user_id
    assert client.get("/api/auth/me").status_code == 200


def test_existing_phone_and_username_cannot_be_mixed(client: TestClient) -> None:
    username_conflict = client.post(
        "/api/auth/request-otp",
        json={"phone_number": "+15550000004", "username": "jack"},
    )
    assert username_conflict.status_code == 409

    phone_challenge = client.post(
        "/api/auth/request-otp",
        json={"phone_number": "+15550000004", "username": "phone-owner"},
    ).json()
    assert client.post(
        "/api/auth/verify-otp",
        json={"challenge_id": phone_challenge["challenge_id"], "code": "123456"},
    ).status_code == 200
    assert client.post("/api/auth/logout").status_code == 204

    phone_conflict = client.post(
        "/api/auth/request-otp",
        json={"phone_number": "+15550000004", "username": "different-user"},
    )
    assert phone_conflict.status_code == 409


def test_username_lookup_accepts_displayed_at_prefix(client: TestClient) -> None:
    assert client.post("/api/auth/demo-login/jack").status_code == 200
    response = client.post("/api/contacts", json={"identifier": " @AVA "})

    assert response.status_code == 201
    assert response.json()["identifier"] == "ava"
    assert response.json()["display_name"] == "Ava Patel"
