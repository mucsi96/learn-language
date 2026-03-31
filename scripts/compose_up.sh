#!/bin/bash
set -e

# Clean up test storage directories
echo "Cleaning up test storage directories..."
rm -rf test/storage

# Create test storage directories with proper permissions
echo "Creating test storage directories with proper permissions..."
mkdir -p test/storage

# Export UID and GID for podman-compose
export USER_ID=$(id -u)
export GROUP_ID=$(id -g)

echo "Running Podman Compose as UID=$USER_ID GID=$GROUP_ID"

# Start Podman Compose with different flags based on environment
echo "Starting Podman Compose services..."
if [ -n "$CI" ]; then
  # CI environment: simpler flags
  podman-compose up --build --detach
else
  # Local development: full set of flags
  podman-compose up --build --force-recreate --detach --remove-orphans
fi

# Wait for services to be healthy
echo "Waiting for services to be ready..."
sleep 5

echo "Podman Compose services are ready!"
