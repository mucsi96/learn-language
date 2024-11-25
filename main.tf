terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "4.11.0"
    }
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.azure_subscription_id
}

data "azurerm_client_config" "current" {}

data "azurerm_storage_account" "storage_account" {
  name                = "ibari"
  resource_group_name = "ibari"
}

data "azurerm_storage_container" "storage_container" {
  name               = "learn-german"
  storage_account_id = data.azurerm_storage_account.storage_account.id
}

resource "azuread_application" "learn_language_app" {
  display_name     = "Learn Language Admin"
  sign_in_audience = "AzureADMyOrg"
  owners           = [data.azurerm_client_config.current.object_id]
  api {
    requested_access_token_version = 2
  }
  single_page_application {
    redirect_uris = ["http://localhost:4200/"]
  }
}

resource "azuread_service_principal" "learn_language_service_principal" {
  client_id = azuread_application.learn_language_app.client_id
}

resource "azurerm_role_assignment" "learn_language_app_role_assignment" {
  scope                = data.azurerm_storage_container.storage_container.id
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = azuread_service_principal.learn_language_service_principal.object_id
}
