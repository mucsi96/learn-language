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

mkdir -p .kube
echo "$db_k8s_config" > .kube/db-config

cat .env > server/.env
echo "ENV=development" >> server/.env
echo "DB_USERNAME=$db_username" >> server/.env
echo "DB_PASSWORD=$db_password" >> server/.env
echo "AZURE_SUBSCRIPTION_ID=$azure_subscription_id" >> server/.env
echo "AZURE_TENANT_ID=$azure_tenant_id" >> server/.env
echo "AZURE_CLIENT_ID=$api_client_id" >> server/.env
echo "AZURE_CLIENT_SECRET=$api_client_secret" >> server/.env
echo "UI_CLIENT_ID=$spa_client_id" >> server/.env
echo "NG_APP_TENANT_ID=$azure_tenant_id" > client/.env
echo "NG_APP_CLIENT_ID=$spa_client_id" >> client/.env
echo "NG_APP_API_CLIENT_ID=$api_client_id" >> client/.env

cd client && npm install && cd ..

pip install -r requirements.txt