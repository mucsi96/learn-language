#!/bin/sh

ai_endpoint=$(az keyvault secret show --vault-name p02 --name ai-endpoint --query value -o tsv)
ai_api_version=$(az keyvault secret show --vault-name p02 --name ai-api-version --query value -o tsv)
ai_access_key=$(az keyvault secret show --vault-name p02 --name ai-access-key --query value -o tsv)

echo "AZURE_OPENAI_ENDPOINT=$ai_endpoint" > .env
echo "AZURE_OPENAI_API_KEY=$ai_access_key" >> .env
echo "AZURE_OPENAI_API_VERSION=$ai_api_version" >> .env

cd client && npm install && cd ..

pip install -r requirements.txt