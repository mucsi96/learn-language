#!/bin/bash

set -e  # Exit immediately if a command exits with a non-zero status

appName=learn-language
subscriptionId=$(az account show --query id -o tsv)

echo "Generating SAS token for storage account..."
sasToken=$(az storage container generate-sas \
  --permissions acdlrw \
  --account-name ibari \
  --name terraform-states \
  --expiry $(date -u -d '365 days' +%Y-%m-%dT%H:%MZ) \
  --output tsv)

cat <<EOT > backend.tf
terraform {
    backend "azurerm" {
        storage_account_name = "ibari"
        container_name       = "terraform-states"
        key                  = "$appName.tfstate"
        sas_token            = "$sasToken"
    }
}

variable "azure_subscription_id" {
  type    = string
  default = "$subscriptionId"
}
EOT

terraform init