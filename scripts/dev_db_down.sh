#!/bin/bash
set -e

SYSTEMD_DIR="$HOME/.config/containers/systemd"

echo "Stopping development database..."
systemctl --user stop learn-language-db.service 2>/dev/null || true

echo "Removing Quadlet definition..."
rm -f "$SYSTEMD_DIR/learn-language-db.container"

echo "Reloading systemd user daemon..."
systemctl --user daemon-reload

echo "Cleaning up container..."
podman rm -f learn-language-db 2>/dev/null || true

echo "Development database stopped."
