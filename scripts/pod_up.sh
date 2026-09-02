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
  # The Spring profile is baked into the native executable during AOT
  # processing, so the pod image has to be built with the test profile.
  podman build --build-arg SPRING_PROFILE=test \
    -t localhost/learn-language-server:test "$PROJECT_DIR/server" &
  podman build -t localhost/learn-language-client:test "$PROJECT_DIR/client" &
  podman build -t localhost/learn-language-mock-openai:test "$PROJECT_DIR/mock_openai_server" &
  podman build -t localhost/learn-language-mock-google-ai:test "$PROJECT_DIR/mock_google_ai_server" &
  podman build -t localhost/learn-language-mock-elevenlabs:test "$PROJECT_DIR/mock_elevenlabs_server" &
  podman build -t localhost/learn-language-mock-anthropic:test "$PROJECT_DIR/mock_anthropic_server" &
  podman build -t localhost/learn-language-mock-ideogram:test "$PROJECT_DIR/mock_ideogram_server" &
  wait
fi

echo "Cleaning up existing pod..."
podman kube down "$PROJECT_DIR/test/test-pod.yaml" 2>/dev/null || true

echo "Starting pod..."
podman kube play "$PROJECT_DIR/test/test-pod.yaml"

container_state() {
  podman inspect "$1" \
    --format 'status={{.State.Status}} exit={{.State.ExitCode}} error={{.State.Error}}' \
    2>&1 || true
}

dump_logs() {
  for c in $CONTAINERS; do
    echo "$c" | grep -q "infra" && continue
    echo "=== $c === $(container_state "$c")"
    podman logs "$c" 2>&1 | tail -20
  done
}

echo "Waiting for all containers to become healthy..."
CONTAINERS=$(podman pod inspect "$POD_NAME" --format '{{range .Containers}}{{.Name}} {{end}}')

for container in $CONTAINERS; do
  if echo "$container" | grep -q "infra"; then
    continue
  fi
  echo "  Waiting for $container..."
  ELAPSED=0
  # Run each container's healthcheck on demand instead of reading
  # .State.Health.Status: Podman 5 on GitHub runners never schedules or
  # records probe runs, so the status alone never becomes "healthy".
  until podman healthcheck run "$container" > /dev/null 2>&1; do
    # A container that has already exited is never going to pass its probe, and
    # its state carries the reason a crash or a failed exec leaves no logs.
    if [ "$(podman inspect "$container" --format '{{.State.Status}}' 2>/dev/null)" = "exited" ]; then
      echo "$container exited before becoming healthy: $(container_state "$container")"
      dump_logs
      exit 1
    fi
    if [ "$ELAPSED" -ge "$MAX_WAIT" ]; then
      echo "Timeout waiting for $container to become healthy: $(container_state "$container")"
      dump_logs
      exit 1
    fi
    sleep 2
    ELAPSED=$((ELAPSED + 2))
  done
  echo "  $container is healthy"
done

echo "All services are ready!"
