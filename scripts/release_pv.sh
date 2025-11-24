#!/bin/bash

set -e  # Exit immediately if a command exits with a non-zero status

# Detect if running on Ubuntu
if [ "$(uname -s)" = "Linux" ] && [ -f /etc/os-release ]; then
    . /etc/os-release
    if [ "$ID" = "ubuntu" ]; then
        echo "Running on Ubuntu. Checking dependencies..."

        # Check and install jq
        if ! command -v jq &> /dev/null; then
            echo "Installing jq..."
            sudo apt-get install -y jq
        else
            echo "jq is already installed."
        fi
    fi
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "Error: kubectl is not installed."
    exit 1
fi

echo "Getting Kubeconfig..."
KUBE_CONTENT=$(az keyvault secret show --vault-name p06-learn-language --name k8s-config --query value -o tsv)

# Create a temporary file in /dev/shm (RAM) to avoid writing to disk
KUBECONFIG_FILE=$(mktemp /dev/shm/kubeconfig.XXXXXX)
chmod 600 "$KUBECONFIG_FILE"
echo "$KUBE_CONTENT" > "$KUBECONFIG_FILE"
export KUBECONFIG="$KUBECONFIG_FILE"

# Ensure the temporary file is deleted when the script exits
trap 'rm -f "$KUBECONFIG_FILE"' EXIT

PV_NAME=${1:-learn-language-app}

echo "Removing claimRef from PersistentVolume $PV_NAME..."
kubectl patch pv "$PV_NAME" -p '{"spec":{"claimRef": null}}'

echo "Successfully removed claimRef from $PV_NAME"
