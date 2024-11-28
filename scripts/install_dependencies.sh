#!/bin/sh

set -e  # Exit immediately if a command exits with a non-zero status

demo_k8s_config=$(az keyvault secret show --vault-name p02 --name demo-namespace-k8s-user-config --query value -o tsv)
ai_endpoint=$(az keyvault secret show --vault-name p02 --name ai-endpoint --query value -o tsv)
ai_deployment=$(az keyvault secret show --vault-name p02 --name ai-deployment --query value -o tsv)
ai_api_version=$(az keyvault secret show --vault-name p02 --name ai-api-version --query value -o tsv)
demo_db_username=$(az keyvault secret show --vault-name p02 --name demo-db-username --query value -o tsv)
demo_db_password=$(az keyvault secret show --vault-name p02 --name demo-db-password --query value -o tsv)
azure_tenant_id=$(terraform output -raw tenant_id)
admin_api_client_id=$(terraform output -raw admin_api_client_id)
admin_api_client_secret=$(terraform output -raw admin_api_client_secret)
admin_api_scope=$(terraform output -raw admin_api_scope)
admin_spa_client_id=$(terraform output -raw admin_spa_client_id)

mkdir -p .kube
echo "$demo_k8s_config" > .kube/demo-config

echo "ENV=development" > .env
echo "AZURE_OPENAI_ENDPOINT=$ai_endpoint" >> .env
echo "AZURE_OPENAI_DEPLOYMENT=$ai_deployment" >> .env
echo "AZURE_OPENAI_API_VERSION=$ai_api_version" >> .env
echo "DEMO_DB_USERNAME=$demo_db_username" >> .env
echo "DEMO_DB_PASSWORD=$demo_db_password" >> .env
echo "AZURE_TENANT_ID=$azure_tenant_id" >> .env
echo "AZURE_CLIENT_ID=$admin_api_client_id" >> .env
echo "AZURE_CLIENT_SECRET=$admin_api_client_secret" >> .env
echo "NG_APP_TENANT_ID=$azure_tenant_id" > client/.env
echo "NG_APP_CLIENT_ID=$admin_spa_client_id" >> client/.env
echo "NG_APP_API_SCOPE=$admin_api_scope" >> client/.env

cd client && npm install && cd ..

pip install -r requirements.txt