#!/bin/bash
set -e

# Clean up test storage directories
echo "Cleaning up test storage directories..."
rm -rf test/storage

# Create test storage directories with proper permissions
echo "Creating test storage directories with proper permissions..."
mkdir -p test/storage

# Export UID and GID for docker-compose
export USER_ID=$(id -u)
export GROUP_ID=$(id -g)

echo "Running Docker Compose as UID=$USER_ID GID=$GROUP_ID"

# Start Docker Compose with different flags based on environment
echo "Starting Docker Compose services..."
if [ -n "$CI" ]; then
  # CI environment: simpler flags
  docker compose up --build --wait
else
  # Local development: full set of flags
  docker compose up --build --force-recreate --wait --remove-orphans --pull always
fi

echo "Docker Compose services are ready!"
