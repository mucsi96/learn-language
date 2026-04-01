#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
QUADLET_DIR="$PROJECT_DIR/quadlet/dev"
SYSTEMD_DIR="$HOME/.config/containers/systemd"

echo "Installing dev DB Quadlet definition..."
mkdir -p "$SYSTEMD_DIR"

sed "s|{{PROJECT_DIR}}|$PROJECT_DIR|g" \
  "$QUADLET_DIR/learn-language-db.container" > "$SYSTEMD_DIR/learn-language-db.container"

echo "Reloading systemd user daemon..."
systemctl --user daemon-reload

echo "Starting development database..."
systemctl --user start learn-language-db.service

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
