#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
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

echo "Cleaning up existing pod..."
podman kube down "$POD_YAML" 2>/dev/null || true

echo "Preparing pod definition..."
PROCESSED_YAML=$(mktemp)
sed \
  -e "s|{{PROJECT_DIR}}|$PROJECT_DIR|g" \
  -e "s|{{USER_ID}}|$(id -u)|g" \
  -e "s|{{GROUP_ID}}|$(id -g)|g" \
  "$POD_YAML" > "$PROCESSED_YAML"

echo "Starting pod..."
podman kube play "$PROCESSED_YAML"
rm -f "$PROCESSED_YAML"

echo "Waiting for all containers to become healthy..."
CONTAINERS="learn-language-test-traefik learn-language-test-db learn-language-test-mock-openai learn-language-test-mock-google-ai learn-language-test-mock-anthropic learn-language-test-mock-elevenlabs learn-language-test-server learn-language-test-client"
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
