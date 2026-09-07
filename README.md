# Signal Clone

A full-stack, Signal-inspired messaging application built for the Scaler SDE Fullstack assignment.

**Live application:** [https://20-74-234-188.sslip.io](https://20-74-234-188.sslip.io)

The project focuses on reliable messaging fundamentals: mocked authentication, direct and group
conversations, persistent messages, delivery/read receipts, typing indicators, online presence,
responsive UI, and a reviewer-friendly seeded demo.

## Demo access

Use **Try demo** and select any of these accounts:

| Username | Display name |
| --- | --- |
| `jack` | Jack |
| `ava` | Ava Patel |
| `sofia` | Sofia Chen |
| `liam` | Liam Wilson |

All four accounts have contacts and seeded conversations. They also share the **Weekend plans**
group. Open the application in two browser profiles with different users to observe real-time
messages, typing indicators, presence, and receipts.

The **Create account** flow uses transparent mocked verification. The demo OTP is `123456` and is
shown in the interface, so the project never depends on an SMS provider during evaluation.

## Features

- Demo login and mocked OTP registration
- Profile setup with display name, avatar, and bio
- Secure, hashed session tokens in HTTP-only cookies
- Contact search and adding registered users
- Persistent direct messages and group messages
- Idempotent message sends using client-generated IDs
- Real-time WebSocket delivery, typing, presence, and receipts
- Conversation previews, timestamps, unread counts, and online indicators
- Group creation, adding/removing members, and admin role management
- Safeguard that prevents removing the final group administrator
- Signal-inspired responsive desktop and mobile interface
- Settings and logout, with optional assignment features clearly shown as placeholders
- SQLite migrations, deterministic seed data, health checks, and rotating backups
- Docker-based development and production deployment
- Automated frontend/backend validation through GitHub Actions

## Technology

| Layer | Choice |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Backend | Python 3.12, FastAPI, SQLAlchemy, Alembic |
| Database | SQLite with foreign keys and WAL mode |
| Real time | Authenticated WebSockets |
| Production | Docker Compose, Caddy HTTPS, Azure Linux VM |
| Tests | Pytest/FastAPI TestClient, ESLint, TypeScript |

## Architecture

```text
Browser
  ├── HTTPS / static Next.js application
  ├── REST /api/*
  └── WSS /ws
          │
       Caddy
          │
  FastAPI (single worker)
      ├── REST API
      ├── WebSocket connection manager
      ├── SQLAlchemy
      └── SQLite /app/data/signal.db
```

Next.js is exported as static assets and served by the same FastAPI deployment. This gives the
browser one HTTPS origin, which simplifies secure cookies, CORS, and WebSocket configuration.

The backend intentionally runs one worker. The connection registry is in memory and SQLite is a
single-file database; one worker keeps real-time fan-out and writes predictable without introducing
Redis or another service that would make the assignment harder to explain and deploy.

See [Architecture](docs/ARCHITECTURE.md) and [API reference](docs/API.md) for more detail.

## Run locally with Docker

Prerequisites: Docker Desktop with Docker Compose.

```bash
git clone https://github.com/JackivGarg/SIGNAL-CLONE.git
cd SIGNAL-CLONE
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). The API is available at
[http://localhost:8000/api](http://localhost:8000/api), with interactive documentation at
[http://localhost:8000/docs](http://localhost:8000/docs).

The development database lives in the `backend_data` Docker volume. Stop the stack with
`docker compose down`; do not add `-v` if you want to keep local messages.

## Run without Docker

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload
```

On Windows PowerShell, activate with `.venv\Scripts\Activate.ps1`.

Frontend, in another terminal:

```bash
cd frontend
npm ci
npm run dev
```

## Validation

```bash
npm --prefix frontend run typecheck
npm --prefix frontend run lint
npm --prefix frontend run build

backend/.venv/bin/ruff check backend
backend/.venv/bin/pytest backend -q
```

On Windows, use `backend\.venv\Scripts\ruff.exe` and
`backend\.venv\Scripts\pytest.exe`.

## Production deployment

Production uses a single Azure Linux VM with:

- `B2ats_v2` burstable compute
- one persistent 30 GiB Standard SSD
- one static public IP
- Ubuntu unattended security updates
- Docker restart policies and application health checks
- Caddy-managed TLS certificates
- SQLite data bind-mounted at `/opt/signal-clone/data`
- daily consistent backups in `/opt/signal-clone/backups`, retained for 30 days

The provisioning entrypoint is `deploy/provision-vm.sh`. It can be rerun safely: it fast-forwards
the repository, preserves `.env` and SQLite data, rebuilds changed layers, and waits for application
health before Caddy serves the new container.

Production secrets are generated directly on the VM and are not stored in Git. The public deployment
keeps demo mode enabled so reviewers always have working access.

## Environment variables

| Variable | Purpose | Development default |
| --- | --- | --- |
| `APP_ENV` | Runtime environment | `development` |
| `APP_SECRET` | Server-side application secret | local-only value |
| `DATABASE_URL` | SQLAlchemy SQLite URL | `sqlite:///./data/signal.db` |
| `DEMO_MODE` | Enables seeded demo login and displayed OTP | `true` |
| `DEMO_OTP` | Mocked verification code | `123456` |
| `SESSION_COOKIE_SECURE` | Restricts session cookie to HTTPS | `false` |
| `SESSION_DURATION_DAYS` | Session lifetime | `30` |
| `CORS_ORIGINS` | Allowed browser origins | `http://localhost:3000` |
| `STATIC_DIRECTORY` | Exported frontend directory in production | unset |
| `BACKUP_DIRECTORY` | SQLite backup destination | `./backups` |
| `BACKUP_RETENTION_DAYS` | Number of days to keep backups | `30` |

## Scope note

This is an educational Signal clone, not the official Signal client. Messages are persisted in
SQLite but are **not end-to-end encrypted**. Voice/video calls, stories, and linked-device cryptography
are represented as interface placeholders because the assignment permits placeholders for those
optional capabilities. The implemented security boundary covers authentication, authorization,
secure cookies, validation, group-admin controls, and HTTPS transport.
