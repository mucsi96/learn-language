#!/bin/sh

set -e  # Exit immediately if a command exits with a non-zero status

db_k8s_config=$(az keyvault secret show --vault-name p05 --name db-namespace-k8s-user-config --query value -o tsv)
db_username=$(az keyvault secret show --vault-name p05 --name db-username --query value -o tsv)
db_password=$(az keyvault secret show --vault-name p05 --name db-password --query value -o tsv)
azure_subscription_id=$(az account show --query id --output tsv)
azure_tenant_id=$(az keyvault secret show --vault-name p05 --name tenant-id --query value -o tsv)
api_client_id=$(az keyvault secret show --vault-name p05 --name learn-language-api-client-id --query value -o tsv)
api_client_secret=$(az keyvault secret show --vault-name p05 --name learn-language-api-client-secret --query value -o tsv)
spa_client_id=$(az keyvault secret show --vault-name p05 --name learn-language-spa-client-id --query value -o tsv)
openai_api_key=$(az keyvault secret show --vault-name p05 --name learn-language-openai-api-key --query value -o tsv)
storageAccountBlobUrl=$(az storage account show --name ibari --resource-group ibari --query "primaryEndpoints.blob" --output tsv)

mkdir -p .kube
echo "$db_k8s_config" > .kube/db-config

echo "SPRING_ACTUATOR_PORT=8082" > server/.env
echo "SPRING_PROFILES_ACTIVE=local" >> server/.env
echo "DB_USERNAME=$db_username" >> server/.env
echo "DB_PASSWORD=$db_password" >> server/.env
echo "DB_HOSTNAME=localhost" >> server/.env
echo "DB_PORT=5461" >> server/.env
echo "DB_NAME=postgres1" >> server/.env
echo "AZURE_SUBSCRIPTION_ID=$azure_subscription_id" >> server/.env
echo "AZURE_TENANT_ID=$azure_tenant_id" >> server/.env
echo "AZURE_CLIENT_ID=$api_client_id" >> server/.env
echo "AZURE_CLIENT_SECRET=$api_client_secret" >> server/.env
echo "UI_CLIENT_ID=$spa_client_id" >> server/.env
echo "OPENAI_API_KEY=$openai_api_key" >> server/.env
echo "STORAGE_ACCOUNT_BLOB_URL=$storageAccountBlobUrl" >> server/.env
echo "STORAGE_ACCOUNT_CONTAINER_NAME=learn-language" >> server/.env


echo "NG_APP_TENANT_ID=$azure_tenant_id" > client/.env
echo "NG_APP_CLIENT_ID=$spa_client_id" >> client/.env
echo "NG_APP_API_CLIENT_ID=$api_client_id" >> client/.env

pip install -r requirements.txt

cd server && mvn clean install && cd ..
cd client && npm install && cd ..

playwright install --with-deps chromium
