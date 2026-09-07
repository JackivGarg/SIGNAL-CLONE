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
        "/api/auth/request-otp", json={"identifier": "new-reviewer"}
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
