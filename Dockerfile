FROM node:24-alpine AS frontend-builder

WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_ENV=production \
    DATABASE_URL=sqlite:////app/data/signal.db \
    STATIC_DIRECTORY=/app/static \
    SESSION_COOKIE_SECURE=true \
    CORS_ORIGINS=https://localhost

WORKDIR /app
COPY backend/pyproject.toml ./
COPY backend/alembic.ini ./
RUN pip install --no-cache-dir .
COPY backend/app ./app
COPY backend/migrations ./migrations
COPY --from=frontend-builder /build/frontend/out ./static

RUN mkdir -p /app/data && useradd --create-home --uid 10001 signal && chown -R signal:signal /app
USER signal

EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && python -m app.seed && exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1 --proxy-headers --forwarded-allow-ips='*'"]
