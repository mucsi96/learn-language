#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
POD_NAME="learn-language-test"
MAX_WAIT=120

echo "Cleaning up test storage directories..."
rm -rf "$PROJECT_DIR/test/storage"
mkdir -p "$PROJECT_DIR/test/storage"

if [ "${SKIP_BUILD:-}" = "1" ]; then
  echo "Skipping image build (SKIP_BUILD=1)..."
else
  echo "Building container images..."
  podman build -t localhost/learn-language-server:test "$PROJECT_DIR/server" &
  podman build -t localhost/learn-language-client:test "$PROJECT_DIR/client" &
  podman build -t localhost/learn-language-mock-openai:test "$PROJECT_DIR/mock_openai_server" &
  podman build -t localhost/learn-language-mock-google-ai:test "$PROJECT_DIR/mock_google_ai_server" &
  podman build -t localhost/learn-language-mock-elevenlabs:test "$PROJECT_DIR/mock_elevenlabs_server" &
  podman build -t localhost/learn-language-mock-anthropic:test "$PROJECT_DIR/mock_anthropic_server" &
  wait
fi

echo "Cleaning up existing pod..."
podman kube down "$PROJECT_DIR/test/test-pod.yaml" 2>/dev/null || true

echo "Starting pod..."
podman kube play "$PROJECT_DIR/test/test-pod.yaml"

echo "Waiting for all containers to become healthy..."
CONTAINERS=$(podman pod inspect "$POD_NAME" --format '{{range .Containers}}{{.Name}} {{end}}')

for container in $CONTAINERS; do
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
