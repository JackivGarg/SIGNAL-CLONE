# API reference

All protected REST endpoints use the `signal_session` HTTP-only cookie. Error responses use FastAPI's
standard `{ "detail": "..." }` format.

## Authentication

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/auth/demo-users` | List the four reviewer accounts |
| `POST` | `/api/auth/demo-login/{identifier}` | Start a demo session |
| `POST` | `/api/auth/request-otp` | Create a mocked OTP challenge |
| `POST` | `/api/auth/verify-otp` | Consume the OTP and sign in/create the user |
| `PATCH` | `/api/auth/profile` | Complete or update the signed-in profile |
| `GET` | `/api/auth/me` | Return the signed-in user |
| `POST` | `/api/auth/logout` | Invalidate the current session and clear its cookie |

## Contacts

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/contacts?query=` | List/search the current user's contacts |
| `POST` | `/api/contacts` | Add a registered user by identifier |

## Conversations and messages

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/conversations` | List previews with unread counts |
| `POST` | `/api/conversations/direct` | Get or create a direct conversation |
| `POST` | `/api/conversations/groups` | Create a group with the caller as admin |
| `GET` | `/api/conversations/{id}/messages` | Return up to 100 recent messages |
| `POST` | `/api/conversations/{id}/messages` | Persist and broadcast a message |
| `POST` | `/api/conversations/{id}/read` | Mark received messages as read |
| `GET` | `/api/conversations/{id}/members` | List group members and roles |
| `POST` | `/api/conversations/{id}/members` | Add a member (admin only) |
| `PATCH` | `/api/conversations/{id}/members/{userId}` | Promote/demote a member (admin only) |
| `DELETE` | `/api/conversations/{id}/members/{userId}` | Remove a member (admin only) |

## Health

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health/live` | Process liveness |
| `GET` | `/api/health/ready` | Database readiness |

## WebSocket

Connect to `/ws` with a valid session cookie. The server closes unauthenticated sockets with policy
violation code `1008`.

Client events:

- `ping`
- `typing.started` with `conversation_id`
- `typing.stopped` with `conversation_id`

Server events:

- `connection.ready`
- `pong`
- `message.created`
- `receipt.updated`
- `typing.started`
- `typing.stopped`
- `presence.updated`
