#!/bin/bash
set -e

echo "Stopping development database..."
podman rm -f learn-language-db 2>/dev/null || true

echo "Development database stopped."
