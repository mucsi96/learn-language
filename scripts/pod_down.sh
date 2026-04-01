#!/bin/bash
set -e

SYSTEMD_DIR="$HOME/.config/containers/systemd"

echo "Stopping learn-language-test pod..."
systemctl --user stop learn-language-test-pod.service 2>/dev/null || true

echo "Removing Quadlet definitions..."
rm -f "$SYSTEMD_DIR"/learn-language-test.pod
rm -f "$SYSTEMD_DIR"/traefik.container
rm -f "$SYSTEMD_DIR"/client.container
rm -f "$SYSTEMD_DIR"/server.container
rm -f "$SYSTEMD_DIR"/db.container
rm -f "$SYSTEMD_DIR"/mock-openai.container
rm -f "$SYSTEMD_DIR"/mock-google-ai.container
rm -f "$SYSTEMD_DIR"/mock-anthropic.container
rm -f "$SYSTEMD_DIR"/mock-elevenlabs.container

echo "Reloading systemd user daemon..."
systemctl --user daemon-reload

echo "Cleaning up pod..."
podman pod rm -f learn-language-test 2>/dev/null || true

echo "Pod stopped and cleaned up."
