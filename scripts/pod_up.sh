#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
POD_NAME="learn-language-test"
MAX_WAIT=120

echo "Cleaning up test storage directories..."
rm -rf "$PROJECT_DIR/test/storage"

echo "Creating test storage directories with proper permissions..."
mkdir -p "$PROJECT_DIR/test/storage"

echo "Building container images..."
podman build -t localhost/learn-language-server:test "$PROJECT_DIR/server" &
podman build -t localhost/learn-language-client:test "$PROJECT_DIR/client" &
podman build -t localhost/learn-language-mock-openai:test "$PROJECT_DIR/mock_openai_server" &
podman build -t localhost/learn-language-mock-google-ai:test "$PROJECT_DIR/mock_google_ai_server" &
podman build -t localhost/learn-language-mock-anthropic:test "$PROJECT_DIR/mock_anthropic_server" &
podman build -t localhost/learn-language-mock-elevenlabs:test "$PROJECT_DIR/mock_elevenlabs_server" &
wait

echo "Cleaning up existing pod..."
podman kube down "test/test-pod.yaml" 2>/dev/null || true

echo "Starting pod..."
podman kube play test/test-pod.yaml

echo "Waiting for all containers to become healthy..."
CONTAINERS=$(podman pod inspect "$POD_NAME" --format '{{range .Containers}}{{.Name}} {{end}}')

for container in $CONTAINERS; do
  # Skip the infra container
  if echo "$container" | grep -q "infra"; then
    continue
  fi
  echo "  Waiting for $container..."
  ELAPSED=0
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
    if [ "$STATUS" = "healthy" ]; then
      echo "  $container is healthy"
      break
    fi
    sleep 2
    ELAPSED=$((ELAPSED + 2))
  done
done

echo "All services are ready!"
