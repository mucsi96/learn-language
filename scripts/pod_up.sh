#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
QUADLET_DIR="$PROJECT_DIR/quadlet/test"
SYSTEMD_DIR="$HOME/.config/containers/systemd"

echo "Cleaning up test storage directories..."
rm -rf "$PROJECT_DIR/test/storage"

echo "Creating test storage directories with proper permissions..."
mkdir -p "$PROJECT_DIR/test/storage"

echo "Building container images..."
podman build -t localhost/learn-language-server:test "$PROJECT_DIR/server"
podman build -t localhost/learn-language-client:test "$PROJECT_DIR/client"
podman build -t localhost/learn-language-mock-openai:test "$PROJECT_DIR/mock_openai_server"
podman build -t localhost/learn-language-mock-google-ai:test "$PROJECT_DIR/mock_google_ai_server"
podman build -t localhost/learn-language-mock-anthropic:test "$PROJECT_DIR/mock_anthropic_server"
podman build -t localhost/learn-language-mock-elevenlabs:test "$PROJECT_DIR/mock_elevenlabs_server"

echo "Installing Quadlet definitions..."
mkdir -p "$SYSTEMD_DIR"

USER_ID=$(id -u)
GROUP_ID=$(id -g)

for file in "$QUADLET_DIR"/*.pod "$QUADLET_DIR"/*.container; do
  [ -f "$file" ] || continue
  sed \
    -e "s|{{PROJECT_DIR}}|$PROJECT_DIR|g" \
    -e "s|{{USER_ID}}|$USER_ID|g" \
    -e "s|{{GROUP_ID}}|$GROUP_ID|g" \
    "$file" > "$SYSTEMD_DIR/$(basename "$file")"
done

echo "Reloading systemd user daemon..."
systemctl --user daemon-reload

echo "Starting learn-language-test pod..."
systemctl --user start learn-language-test-pod.service

echo "Waiting for all containers to become healthy..."
CONTAINERS="traefik db mock-openai mock-google-ai mock-anthropic mock-elevenlabs server client"
MAX_WAIT=120
ELAPSED=0

for container in $CONTAINERS; do
  echo "  Waiting for $container..."
  while true; do
    if [ "$ELAPSED" -ge "$MAX_WAIT" ]; then
      echo "Timeout waiting for $container to become healthy"
      podman pod logs learn-language-test 2>&1 | tail -50
      exit 1
    fi
    STATUS=$(podman inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "missing")
    if [ "$STATUS" = "healthy" ]; then
      echo "  $container is healthy"
      break
    fi
    sleep 2
    ELAPSED=$((ELAPSED + 2))
  done
done

echo "All services are ready!"
