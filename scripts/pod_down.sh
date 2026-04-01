#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
POD_YAML="$PROJECT_DIR/test/test-pod.yaml"

echo "Stopping pods..."
podman kube down "$POD_YAML" 2>/dev/null || true

echo "Removing network..."
podman network rm learn-language-test 2>/dev/null || true

echo "Stopping podman API socket..."
pkill -f "podman system service.*podman.sock" 2>/dev/null || true
rm -f /tmp/podman.sock

echo "Pod stopped and cleaned up."
