#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

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

echo "Removing existing pod if present..."
podman pod rm -f learn-language-test 2>/dev/null || true

echo "Creating pod..."
podman pod create \
  --name learn-language-test \
  -p 8180:80 \
  -p 8181:8081 \
  -p 5460:5432

USER_ID=$(id -u)
GROUP_ID=$(id -g)

echo "Starting containers..."

podman run -d --name traefik --pod learn-language-test \
  -v "$PROJECT_DIR/test/traefik.yaml:/etc/traefik/traefik.yaml:ro" \
  -v "$PROJECT_DIR/test/traefik-routes.yaml:/etc/traefik/routes.yaml:ro" \
  --health-cmd "traefik healthcheck --ping" \
  --health-interval 2s \
  --health-retries 5 \
  --health-start-period 2s \
  docker.io/library/traefik:v3.6

podman run -d --name db --pod learn-language-test \
  -e POSTGRES_DB=test \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  --health-cmd "pg_isready -U postgres" \
  --health-interval 10s \
  --health-timeout 5s \
  --health-retries 5 \
  docker.io/library/postgres:17.5-bullseye

podman run -d --name mock-openai --pod learn-language-test \
  -e PORT=3000 \
  --health-cmd "curl --fail --silent localhost:3000/health || exit 1" \
  --health-interval 2s \
  --health-timeout 3s \
  --health-retries 5 \
  --health-start-period 2s \
  localhost/learn-language-mock-openai:test

podman run -d --name mock-google-ai --pod learn-language-test \
  -e PORT=3001 \
  --health-cmd "curl --fail --silent localhost:3001/health || exit 1" \
  --health-interval 2s \
  --health-timeout 3s \
  --health-retries 5 \
  --health-start-period 2s \
  localhost/learn-language-mock-google-ai:test

podman run -d --name mock-anthropic --pod learn-language-test \
  -e PORT=3003 \
  --health-cmd "curl --fail --silent localhost:3003/health || exit 1" \
  --health-interval 2s \
  --health-timeout 3s \
  --health-retries 5 \
  --health-start-period 2s \
  localhost/learn-language-mock-anthropic:test

podman run -d --name mock-elevenlabs --pod learn-language-test \
  -e PORT=3002 \
  --health-cmd "curl --fail --silent localhost:3002/health || exit 1" \
  --health-interval 2s \
  --health-timeout 3s \
  --health-retries 5 \
  --health-start-period 2s \
  localhost/learn-language-mock-elevenlabs:test

podman run -d --name server --pod learn-language-test \
  --user "$USER_ID:$GROUP_ID" \
  -e SPRING_ACTUATOR_PORT=8182 \
  -e SPRING_PROFILES_ACTIVE=test \
  -e DB_URL=jdbc:postgresql://localhost:5432/test \
  -e DB_USERNAME=postgres \
  -e DB_PASSWORD=postgres \
  -e STORAGE_DIRECTORY=/app/storage \
  -e OPENAI_API_KEY=mock-key \
  -e OPENAI_BASE_URL=http://localhost:3000 \
  -e ANTHROPIC_API_KEY=mock-anthropic-key \
  -e ANTHROPIC_BASE_URL=http://localhost:3003 \
  -e GOOGLE_AI_API_KEY=mock-google-key \
  -e GOOGLE_AI_BASE_URL=http://localhost:3001 \
  -e ELEVEN_LABS_API_KEY=mock-elevenlabs-key \
  -e ELEVEN_LABS_BASE_URL=http://localhost:3002 \
  -v "$PROJECT_DIR/test/storage:/app/storage" \
  --health-cmd "curl --fail --silent localhost:8182/actuator/health/readiness | grep UP || exit 1" \
  --health-interval 2s \
  --health-retries 10 \
  --health-start-period 16s \
  localhost/learn-language-server:test

podman run -d --name client --pod learn-language-test \
  -v "$PROJECT_DIR/test/nginx-pod.conf:/etc/nginx/conf.d/default.conf:ro" \
  --health-cmd "wget --quiet --tries=1 --spider http://localhost:8000/ || exit 1" \
  --health-interval 2s \
  --health-retries 10 \
  --health-start-period 5s \
  localhost/learn-language-client:test

echo "Waiting for all containers to become healthy..."
CONTAINERS="traefik db mock-openai mock-google-ai mock-anthropic mock-elevenlabs server client"
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
    if [ "$STATUS" = "healthy" ]; then
      echo "  $container is healthy"
      break
    fi
    sleep 2
    ELAPSED=$((ELAPSED + 2))
  done
done

echo "All services are ready!"
