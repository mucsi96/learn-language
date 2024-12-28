#!/bin/sh

set -e  # Exit immediately if a command exits with a non-zero status

demo_k8s_config=$(az keyvault secret show --vault-name p05 --name demo-namespace-k8s-user-config --query value -o tsv)
demo_db_username=$(az keyvault secret show --vault-name p05 --name demo-db-username --query value -o tsv)
demo_db_password=$(az keyvault secret show --vault-name p05 --name demo-db-password --query value -o tsv)
azure_subscription_id=$(terraform output -raw subscription_id)
azure_tenant_id=$(terraform output -raw tenant_id)
admin_api_client_id=$(terraform output -raw admin_api_client_id)
admin_api_client_secret=$(terraform output -raw admin_api_client_secret)
admin_spa_client_id=$(terraform output -raw admin_spa_client_id)

mkdir -p .kube
echo "$demo_k8s_config" > .kube/demo-config

echo "ENV=development" > .env
echo "DEMO_DB_USERNAME=$demo_db_username" >> .env
echo "DEMO_DB_PASSWORD=$demo_db_password" >> .env
echo "AZURE_SUBSCRIPTION_ID=$azure_subscription_id" >> .env
echo "AZURE_TENANT_ID=$azure_tenant_id" >> .env
echo "AZURE_CLIENT_ID=$admin_api_client_id" >> .env
echo "AZURE_CLIENT_SECRET=$admin_api_client_secret" >> .env
echo "NG_APP_TENANT_ID=$azure_tenant_id" > client/.env
echo "NG_APP_CLIENT_ID=$admin_spa_client_id" >> client/.env
echo "NG_APP_API_CLIENT_ID=$admin_api_client_id" >> client/.env

cd client && npm install && cd ..

pip install -r requirements.txt