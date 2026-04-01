#!/bin/bash
set -e

echo "Stopping and removing learn-language-test pod..."
podman pod rm -f learn-language-test 2>/dev/null || true

echo "Pod stopped and cleaned up."
