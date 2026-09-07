# Architecture

## Design goals

The architecture is deliberately small enough to explain in an interview while preserving the
important behavior of a messaging system:

1. SQLite is the durable source of truth.
2. REST handles state changes and history retrieval.
3. WebSockets deliver low-latency events after the state is committed.
4. The browser can recover from a dropped socket by reconnecting and reading REST state again.
5. One process owns the in-memory socket registry, avoiding a Redis dependency.

## Request flow

For a sent message:

1. The browser immediately adds an optimistic message with a UUID.
2. `POST /api/conversations/{id}/messages` verifies membership and validates the body.
3. The UUID provides idempotency if the request is retried.
4. The message and recipient receipt rows are committed to SQLite.
5. The server broadcasts `message.created` to connected recipients.
6. Delivery and read state is sent back with `receipt.updated` events.
7. If real-time delivery is missed, fetching message history restores the durable state.

Typing and presence are intentionally ephemeral; they are WebSocket events and are not stored.

## Authentication

- Demo accounts use a dedicated endpoint that is available only when `DEMO_MODE=true`.
- Registration creates a short-lived, one-use OTP challenge. OTP delivery is mocked and visible.
- The raw session token is returned only as an HTTP-only cookie.
- Only a SHA-256 hash of the session token is stored in SQLite.
- Production cookies are `Secure`, `HttpOnly`, `SameSite=Lax`, and scoped to `/`.
- Every contact, conversation, message, receipt, and group-admin operation verifies the current user.

## Database schema

| Table | Purpose | Important constraints |
| --- | --- | --- |
| `users` | Identity and profile | unique identifier |
| `sessions` | Login sessions | unique token hash, expiry |
| `otp_challenges` | Mock verification | hashed code, expiry, one-use timestamp |
| `contacts` | User-owned address book | composite owner/contact key |
| `conversations` | Direct and group metadata | unique direct/group key |
| `conversation_members` | Membership and roles | composite conversation/user key |
| `messages` | Persistent message bodies | unique client message ID |
| `message_receipts` | Per-recipient delivery/read state | composite message/recipient key |

Foreign keys are enabled for every SQLite connection. WAL mode improves read/write concurrency for
the small single-instance workload. Alembic migrations create and evolve the schema.

## Reliability

- Docker restarts both application and proxy containers unless explicitly stopped.
- Caddy waits for the application health check before starting.
- `/api/health/live` checks process availability.
- `/api/health/ready` verifies a real SQLite query.
- WebSocket clients send a heartbeat every 25 seconds and reconnect with capped exponential backoff.
- Daily backups use SQLite's online backup API, which creates a consistent copy while the app runs.
- Backups rotate after 30 days; the live database and backups are outside container layers.
- Ubuntu unattended upgrades install security updates automatically.

## Scaling trade-off

This assignment runs one FastAPI worker because its WebSocket registry is process-local. Horizontal
scaling would require a shared event bus such as Redis and a database designed for multiple writers.
That is intentionally outside scope. For the expected reviewer/demo traffic, the single-worker design
is simpler, cheaper, and consistent with the required SQLite stack.
