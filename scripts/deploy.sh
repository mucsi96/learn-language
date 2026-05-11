#!/bin/bash

set -e  # Exit immediately if a command exits with a non-zero status

: "${AZURE_KEYVAULT_NAME:?Environment variable AZURE_KEYVAULT_NAME is required}"
: "${DOCKERHUB_USERNAME:?Environment variable DOCKERHUB_USERNAME is required}"

AZURE_KEYVAULT_ENDPOINT="https://${AZURE_KEYVAULT_NAME}.vault.azure.net/"
K8S_CONFIG=$(az keyvault secret show --vault-name "$AZURE_KEYVAULT_NAME" --name k8s-config --query value -o tsv)
HOSTNAME=$(az keyvault secret show --vault-name "$AZURE_KEYVAULT_NAME" --name hostname --query value -o tsv)
API_CLIENT_ID=$(az keyvault secret show --vault-name "$AZURE_KEYVAULT_NAME" --name api-client-id --query value -o tsv)

# Create a temporary file in /dev/shm (RAM) to avoid writing to disk
KUBECONFIG_FILE=$(mktemp /dev/shm/kubeconfig.XXXXXX)
chmod 600 "$KUBECONFIG_FILE"
echo "$K8S_CONFIG" > "$KUBECONFIG_FILE"
export KUBECONFIG="$KUBECONFIG_FILE"

# Ensure the temporary file is deleted when the script exits
trap 'rm -f "$KUBECONFIG_FILE"' EXIT

# Get latest tags for both server and client
serverLatestTag=$(curl -s "https://registry.hub.docker.com/v2/repositories/$DOCKERHUB_USERNAME/learn-language-server/tags/" | jq -r '.results | map(select(.name != "latest")) | sort_by(.last_updated) | reverse | .[0].name')
clientLatestTag=$(curl -s "https://registry.hub.docker.com/v2/repositories/$DOCKERHUB_USERNAME/learn-language-client/tags/" | jq -r '.results | map(select(.name != "latest")) | sort_by(.last_updated) | reverse | .[0].name')

echo "Updating Helm repositories..."
helm repo add mucsi96 https://mucsi96.github.io/k8s-helm-charts --force-update

springAppChartVersion=$(helm search repo mucsi96/spring-app --output json | jq -r '.[0].version')
clientAppChartVersion=$(helm search repo mucsi96/client-app --output json | jq -r '.[0].version')

echo "Deploying server: $DOCKERHUB_USERNAME/learn-language-server:$serverLatestTag using spring-app chart $springAppChartVersion"

helm upgrade learn-language-server mucsi96/spring-app \
    --install \
    --version $springAppChartVersion \
    --namespace learn-language \
    --set image=$DOCKERHUB_USERNAME/learn-language-server:$serverLatestTag \
    --set entryPoint=web \
    --set host=$HOSTNAME \
    --set basePath=/api \
    --set clientId=$API_CLIENT_ID \
    --set serviceAccountName=learn-language-api-workload-identity \
    --set env.AZURE_KEYVAULT_ENDPOINT=$AZURE_KEYVAULT_ENDPOINT \
    --set env.STORAGE_DIRECTORY=/app/storage \
    --set persistentVolumeClaims[0].name=learn-language-pvc \
    --set persistentVolumeClaims[0].accessMode=ReadWriteOnce \
    --set persistentVolumeClaims[0].volumeName=learn-language-app \
    --set persistentVolumeClaims[0].mountPath=/app/storage \
    --set persistentVolumeClaims[0].storageClassName="" \
    --set persistentVolumeClaims[0].storage=5Gi \
    --set resources.requests.memory=640Mi \
    --set resources.requests.cpu=50m \
    --set resources.limits.memory=1Gi \
    --set resources.limits.cpu=1 \
    --wait

echo "Deploying client: $DOCKERHUB_USERNAME/learn-language-client:$clientLatestTag using client-app chart $clientAppChartVersion"

helm upgrade learn-language-client mucsi96/client-app \
    --install \
    --version $clientAppChartVersion \
    --namespace learn-language \
    --set image=$DOCKERHUB_USERNAME/learn-language-client:$clientLatestTag \
    --set host=$HOSTNAME \
    --set entryPoint=web \
    --set resources.requests.memory=32Mi \
    --set resources.requests.cpu=10m \
    --set resources.limits.memory=128Mi \
    --set resources.limits.cpu=200m \
    --wait
