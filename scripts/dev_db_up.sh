#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "Removing existing dev database if present..."
podman rm -f learn-language-db 2>/dev/null || true

echo "Starting development database..."
podman run -d --name learn-language-db \
  -e POSTGRES_DB=learnlanguage \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5433:5432 \
  -v learn-language-postgres-data:/var/lib/postgresql/data \
  -v "$PROJECT_DIR/server/src/main/resources/schema.sql:/docker-entrypoint-initdb.d/init.sql" \
  --health-cmd "pg_isready -U postgres" \
  --health-interval 10s \
  --health-timeout 5s \
  --health-retries 5 \
  docker.io/library/postgres:17.5-bullseye

echo "Waiting for database to become healthy..."
MAX_WAIT=60
ELAPSED=0

while true; do
  if [ "$ELAPSED" -ge "$MAX_WAIT" ]; then
    echo "Timeout waiting for database to become healthy"
    exit 1
  fi
  STATUS=$(podman inspect --format='{{.State.Health.Status}}' learn-language-db 2>/dev/null || echo "missing")
  if [ "$STATUS" = "healthy" ]; then
    echo "Development database is ready on port 5433"
    break
  fi
  sleep 2
  ELAPSED=$((ELAPSED + 2))
done
