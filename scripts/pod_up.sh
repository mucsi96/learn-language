#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
NETWORK_NAME="learn-language-test"
POD_YAML="$PROJECT_DIR/test/test-pod.yaml"

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

echo "Cleaning up existing pods..."
podman kube down "$POD_YAML" 2>/dev/null || true
podman network rm "$NETWORK_NAME" 2>/dev/null || true

echo "Creating podman network..."
podman network create "$NETWORK_NAME"

echo "Starting podman API socket for traefik service discovery..."
PODMAN_SOCK="/tmp/podman.sock"
rm -f "$PODMAN_SOCK"
podman system service -t 0 "unix://$PODMAN_SOCK" &
PODMAN_PID=$!
sleep 1

if [ ! -S "$PODMAN_SOCK" ]; then
  echo "Failed to start podman API socket"
  exit 1
fi

echo "Preparing pod definition..."
PROCESSED_YAML=$(mktemp)
sed \
  -e "s|{{PROJECT_DIR}}|$PROJECT_DIR|g" \
  -e "s|{{PODMAN_SOCK}}|$PODMAN_SOCK|g" \
  -e "s|{{USER_ID}}|$(id -u)|g" \
  -e "s|{{GROUP_ID}}|$(id -g)|g" \
  "$POD_YAML" > "$PROCESSED_YAML"

echo "Starting pods..."
podman kube play --network "$NETWORK_NAME" "$PROCESSED_YAML"
rm -f "$PROCESSED_YAML"

echo "Waiting for all containers to become healthy..."
CONTAINERS="traefik-traefik db-db mock-openai-mock-openai mock-google-ai-mock-google-ai mock-anthropic-mock-anthropic mock-elevenlabs-mock-elevenlabs server-server client-client"
MAX_WAIT=120
ELAPSED=0

for container in $CONTAINERS; do
  echo "  Waiting for $container..."
  while true; do
    if [ "$ELAPSED" -ge "$MAX_WAIT" ]; then
      echo "Timeout waiting for $container to become healthy"
      for c in $CONTAINERS; do
        echo "=== $c ==="
        podman logs "$c" 2>&1 | tail -20
      done
      exit 1
    fi
    STATUS=$(podman inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "missing")
    if [ "$STATUS" = "healthy" ] || [ "$STATUS" = "" ]; then
      echo "  $container is ready"
      break
    fi
    sleep 2
    ELAPSED=$((ELAPSED + 2))
  done
done

echo "All services are ready!"
