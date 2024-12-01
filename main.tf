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

data "azuread_application_published_app_ids" "well_known" {}

resource "random_uuid" "admin_api_card_deck_read_scope_id" {}

resource "random_uuid" "admin_api_card_deck_write_scope_id" {}

resource "random_uuid" "admin_api_card_deck_reader_role_id" {}

resource "random_uuid" "admin_api_card_deck_writer_role_id" {}

resource "azuread_service_principal" "msgraph" {
  client_id    = data.azuread_application_published_app_ids.well_known.result.MicrosoftGraph
  use_existing = true
}

data "azurerm_storage_account" "storage_account" {
  name                = "ibari"
  resource_group_name = "ibari"
}

data "azurerm_storage_container" "storage_container" {
  name               = "learn-german"
  storage_account_id = data.azurerm_storage_account.storage_account.id
}


resource "azuread_application" "admin_api" {
  display_name     = "Learn Language Admin API"
  sign_in_audience = "AzureADMyOrg"
  owners           = [data.azurerm_client_config.current.object_id]

  api {
    requested_access_token_version = 2

    oauth2_permission_scope {
      admin_consent_description  = "Allow the application to read cards of a deck"
      admin_consent_display_name = "Allow the application to read cards of a deck"
      id                         = random_uuid.admin_api_card_deck_read_scope_id.result
      value                      = "card-deck-read"
    }

    oauth2_permission_scope {
      admin_consent_description  = "Allow the application to write cards of a deck"
      admin_consent_display_name = "Allow the application to write cards of a deck"
      id                         = random_uuid.admin_api_card_deck_write_scope_id.result
      value                      = "card-deck-write"
    }
  }

  app_role {
    allowed_member_types = ["User"]
    description          = "Users who can read cards of a deck"
    display_name         = "Card Deck Reader"
    enabled              = true
    id                   = random_uuid.admin_api_card_deck_reader_role_id.result
    value                = "card-deck-reader"
  }

  app_role {
    allowed_member_types = ["User"]
    description          = "Users who can write cards of a deck"
    display_name         = "Card Deck Writer"
    enabled              = true
    id                   = random_uuid.admin_api_card_deck_writer_role_id.result
    value                = "card-deck-writer"
  }
}

resource "azuread_application_password" "admin_api_password" {
  application_id = azuread_application.admin_api.id
}

resource "azuread_service_principal" "admin_api_service_principal" {
  client_id                    = azuread_application.admin_api.client_id
  owners                       = [data.azurerm_client_config.current.object_id]
  tags                         = ["WindowsAzureActiveDirectoryIntegratedApp"]
  app_role_assignment_required = false
}

resource "azurerm_role_assignment" "admin_api_role_assignment" {
  scope                = data.azurerm_storage_container.storage_container.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azuread_service_principal.admin_api_service_principal.object_id
}

resource "azuread_application" "admin_spa" {
  display_name     = "Learn Language Admin SPA"
  sign_in_audience = "AzureADMyOrg"
  owners           = [data.azurerm_client_config.current.object_id]

  api {
    requested_access_token_version = 2
  }

  single_page_application {
    redirect_uris = ["http://localhost:4200/auth"]
  }

  required_resource_access {
    resource_app_id = data.azuread_application_published_app_ids.well_known.result.MicrosoftGraph

    resource_access {
      id   = azuread_service_principal.msgraph.oauth2_permission_scope_ids["openid"]
      type = "Scope"
    }

    resource_access {
      id   = azuread_service_principal.msgraph.oauth2_permission_scope_ids["User.Read"]
      type = "Scope"
    }
  }

  required_resource_access {
    resource_app_id = azuread_application.admin_api.client_id

    resource_access {
      id   = random_uuid.admin_api_card_deck_read_scope_id.result
      type = "Scope"
    }

    resource_access {
      id   = random_uuid.admin_api_card_deck_write_scope_id.result
      type = "Scope"
    }
  }
}

resource "azuread_service_principal" "admin_spa_service_principal" {
  client_id                    = azuread_application.admin_spa.client_id
  owners                       = [data.azurerm_client_config.current.object_id]
  tags                         = ["WindowsAzureActiveDirectoryIntegratedApp"]
  app_role_assignment_required = false
}

resource "azuread_application_pre_authorized" "admin_spa_pre_authorized" {
  application_id       = azuread_application.admin_api.id
  authorized_client_id = azuread_application.admin_spa.client_id
  permission_ids       = [random_uuid.admin_api_card_deck_read_scope_id.result, random_uuid.admin_api_card_deck_write_scope_id.result]
}

resource "azuread_service_principal_delegated_permission_grant" "openid_profile_grant" {
  service_principal_object_id          = azuread_service_principal.admin_spa_service_principal.object_id
  resource_service_principal_object_id = azuread_service_principal.msgraph.object_id
  claim_values                         = ["openid", "User.Read"]
}

output "tenant_id" {
  value = data.azurerm_client_config.current.tenant_id
}

output "admin_api_client_id" {
  value = azuread_application.admin_api.client_id
}

output "admin_api_client_secret" {
  value     = azuread_application_password.admin_api_password.value
  sensitive = true
}

output "admin_spa_client_id" {
  value = azuread_application.admin_spa.client_id
}

