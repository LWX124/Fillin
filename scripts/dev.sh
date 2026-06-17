#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

if [ ! -x "$BACKEND_DIR/.venv/bin/uvicorn" ]; then
  echo "Backend virtualenv is missing. Run: make install-backend"
  exit 1
fi

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo "Frontend dependencies are missing. Run: make install-frontend"
  exit 1
fi

if [ ! -f "$BACKEND_DIR/.env" ]; then
  cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
  echo "Created backend/.env from backend/.env.example. Update API keys before using AI features."
fi

if [ ! -f "$FRONTEND_DIR/.env.local" ]; then
  cp "$FRONTEND_DIR/.env.development" "$FRONTEND_DIR/.env.local"
  echo "Created frontend/.env.local from frontend/.env.development."
fi

echo "Starting infrastructure services..."
docker compose -f "$ROOT_DIR/docker-compose.yml" up -d postgres redis qdrant

echo "Waiting for PostgreSQL to become ready..."
for _ in {1..30}; do
  if docker compose -f "$ROOT_DIR/docker-compose.yml" exec -T postgres pg_isready -U fillin >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

if ! docker compose -f "$ROOT_DIR/docker-compose.yml" exec -T postgres pg_isready -U fillin >/dev/null 2>&1; then
  echo "PostgreSQL did not become ready in time."
  exit 1
fi

echo "Running database migrations..."
(cd "$BACKEND_DIR" && .venv/bin/alembic upgrade head)

pids=()
cleanup() {
  for pid in "${pids[@]:-}"; do
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
    fi
  done
}
trap cleanup EXIT INT TERM

echo "Starting backend on http://localhost:8002"
(cd "$BACKEND_DIR" && .venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8002) &
pids+=("$!")

echo "Starting frontend on http://localhost:3000"
(cd "$FRONTEND_DIR" && npm run dev) &
pids+=("$!")

wait
