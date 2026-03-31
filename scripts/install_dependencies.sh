#!/bin/sh

set -e  # Exit immediately if a command exits with a non-zero status

# Detect if running on Ubuntu
if [ "$(uname -s)" = "Linux" ] && [ -f /etc/os-release ]; then
    . /etc/os-release
    if [ "$ID" = "ubuntu" ]; then
        echo "Running on Ubuntu. Checking dependencies..."

        # Update package cache
        echo "Updating package cache..."
        sudo apt-get update

        # Check and install azure-cli
        if ! command -v az >/dev/null 2>&1; then
            echo "Installing Azure CLI..."
            curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
        else
            echo "Azure CLI is already installed."
        fi

        # Check and install helm
        if ! command -v helm >/dev/null 2>&1; then
            echo "Installing Helm..."
            sudo snap install helm --classic
        else
            echo "Helm is already installed."
        fi

        # Check and install kubectl
        if ! command -v kubectl >/dev/null 2>&1; then
            echo "Installing kubectl..."
            sudo snap install kubectl --classic
        else
            echo "kubectl is already installed."
        fi

        # Check and install jq
        if ! command -v jq >/dev/null 2>&1; then
            echo "Installing jq..."
            sudo apt-get install -y jq
        else
            echo "jq is already installed."
        fi

        # Check and install ffmpeg
        if ! command -v ffmpeg >/dev/null 2>&1; then
            echo "Installing ffmpeg..."
            sudo apt-get install -y ffmpeg
        else
            echo "ffmpeg is already installed."
        fi

        # Check and install podman
        if ! command -v podman >/dev/null 2>&1; then
            echo "Installing Podman..."
            sudo apt-get install -y podman
        else
            echo "Podman is already installed."
        fi

        # Check and install podman-compose
        if ! command -v podman-compose >/dev/null 2>&1; then
            echo "Installing podman-compose..."
            sudo apt-get install -y podman-compose
        else
            echo "podman-compose is already installed."
        fi

        # Configure Testcontainers for Podman
        TESTCONTAINERS_CONFIG="$HOME/.testcontainers.properties"
        USER_ID=$(id -u)
        if [ ! -f "$TESTCONTAINERS_CONFIG" ]; then
            echo "Creating Testcontainers configuration for Podman..."
            cat > "$TESTCONTAINERS_CONFIG" <<EOF
docker.host=unix:///run/user/$USER_ID/podman/podman.sock
testcontainers.reuse.enable=true
EOF
            echo "Testcontainers configuration created at $TESTCONTAINERS_CONFIG"
        else
            echo "Testcontainers configuration already exists at $TESTCONTAINERS_CONFIG"
        fi

        # Configure Podman registries for short-name resolution
        PODMAN_CONFIG_DIR="$HOME/.config/containers"
        REGISTRIES_CONFIG="$PODMAN_CONFIG_DIR/registries.conf"
        mkdir -p "$PODMAN_CONFIG_DIR"

        if [ ! -f "$REGISTRIES_CONFIG" ]; then
            echo "Configuring Podman registries for short-name resolution..."
            cat > "$REGISTRIES_CONFIG" <<'EOF'
unqualified-search-registries = ["docker.io"]

[[registry]]
location = "docker.io"
EOF
            echo "Podman registries configuration created at $REGISTRIES_CONFIG"
        else
            echo "Podman registries configuration already exists at $REGISTRIES_CONFIG"
        fi

        # Enable Podman socket for current user
        if ! systemctl --user is-enabled podman.socket >/dev/null 2>&1; then
            echo "Enabling Podman socket..."
            systemctl --user enable --now podman.socket
            echo "Podman socket enabled"
        else
            echo "Podman socket is already enabled"
        fi

        # Check and install SDKMAN
        if [ ! -d "$HOME/.sdkman" ]; then
            echo "Installing SDKMAN..."
            curl -s "https://get.sdkman.io" | bash
        else
            echo "SDKMAN is already installed."
        fi

        # Source SDKMAN
        export SDKMAN_DIR="$HOME/.sdkman"
        [ -s "$SDKMAN_DIR/bin/sdkman-init.sh" ] && . "$SDKMAN_DIR/bin/sdkman-init.sh"

        # Check and install JDK via SDKMAN
        if ! sdk list java | grep -q "21\.0\.[0-9]*.*tem.*installed"; then
            echo "Installing JDK 21.0.x via SDKMAN..."
            sdk install java 21.0.9-tem
        else
            echo "JDK 21.0.x is already installed."
        fi

        # Check and install Maven via SDKMAN
        if ! command -v mvn >/dev/null 2>&1; then
            echo "Installing Maven via SDKMAN..."
            sdk install maven
        else
            echo "Maven is already installed."
        fi

        # Check and install angular-cli
        if ! command -v ng >/dev/null 2>&1; then
            echo "Installing Angular CLI..."
            sudo npm install -g @angular/cli
        else
            echo "Angular CLI is already installed."
        fi
    fi
fi

echo "Building server..."
cd server && mvn clean install && cd ..

echo "Installing client dependencies..."
cd client && npm install && cd ..

echo "Installing mock ElevenLabs server dependencies..."
cd mock_elevenlabs_server && npm install && cd ..

echo "Installing mock Google AI server dependencies..."
cd mock_google_ai_server && npm install && cd ..

echo "Installing mock OpenAI server dependencies..."
cd mock_openai_server && npm install && cd ..

echo "Installing test dependencies..."
cd test && npm install && npx playwright install --with-deps chromium && cd ..
