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

dnsZone=$(az keyvault secret show --vault-name p06 --name dns-zone --query value --output tsv)
apiClientId=$(az keyvault secret show --vault-name p06 --name learn-language-api-client-id --query value --output tsv)
spaClientId=$(az keyvault secret show --vault-name p06 --name learn-language-spa-client-id --query value --output tsv)
db_username=$(az keyvault secret show --vault-name p06 --name db-username --query value -o tsv)
db_password=$(az keyvault secret show --vault-name p06 --name db-password --query value -o tsv)
openai_api_key=$(az keyvault secret show --vault-name p06 --name learn-language-openai-api-key --query value -o tsv)
langsmith_api_key=$(az keyvault secret show --vault-name p06 --name learn-language-langsmith-api-key --query value -o tsv)
google_ai_api_key=$(az keyvault secret show --vault-name p06 --name learn-language-google-ai-api-key --query value -o tsv)
eleven_labs_api_key=$(az keyvault secret show --vault-name p06 --name learn-language-eleven-labs-api-key --query value -o tsv)
latestTag=$(curl -s "https://registry.hub.docker.com/v2/repositories/mucsi96/learn-language/tags/" | jq -r '.results |  map(select(.name != "latest")) | sort_by(.last_updated) | reverse | .[0].name')
chartVersion=20.0.0 #https://github.com/mucsi96/k8s-helm-charts/releases

echo "Updating Helm repositories..."

helm repo update

echo "Deploying mucsi96/learn-language:$latestTag to language.$dnsZone using spring-app chart $chartVersion"

helm upgrade learn-language mucsi96/spring-app \
    --install \
    --version $chartVersion \
    --kubeconfig .kube/config \
    --namespace learn-language \
    --set image=mucsi96/learn-language:$latestTag \
    --set host=language.$dnsZone \
    --set entryPoint=web \
    --set clientId=$apiClientId \
    --set serviceAccountName=learn-language-api-workload-identity \
    --set env.STORAGE_DIRECTORY=/app/storage \
    --set env.DB_HOSTNAME=postgres1.db \
    --set env.DB_PORT=5432 \
    --set env.DB_NAME=postgres1 \
    --set env.DB_USERNAME=$db_username \
    --set env.DB_PASSWORD=$db_password \
    --set env.OPENAI_API_KEY=$openai_api_key \
    --set env.LANGSMITH_API_KEY=$langsmith_api_key \
    --set env.GOOGLE_AI_API_KEY=$google_ai_api_key \
    --set env.ELEVEN_LABS_API_KEY=$eleven_labs_api_key \
    --set env.UI_CLIENT_ID=$spaClientId \
    --set persistentVolumeClaims[0].name=learn-language-pvc \
    --set persistentVolumeClaims[0].mountPath=/app/storage \
    --wait
