extension microsoftGraphV1

var storageBlobDataReaderRoleId = '2a2b9908-6ea1-4ae2-8e65-a410df84e7d1'

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: 'ibari'
}

resource learnLanguageApp 'Microsoft.Graph/applications@v1.0' = {
  displayName: 'Learn Language Admin'
  uniqueName: 'learn-language-admin'
  signInAudience: 'AzureADMyOrg'
  spa: {
    redirectUris: [
      'http://localhost:4200/'
    ]
  }
  api: {
    requestedAccessTokenVersion: 2
  }
}

resource learnLanguageServicePrincipal 'Microsoft.Graph/servicePrincipals@v1.0' = {
  appId: learnLanguageApp.appId
}

resource learnLanguageAppRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(subscription().subscriptionId, 'learnLanguageAppRoleAssignment')
  scope: storageAccount
  properties: {
    principalId: learnLanguageServicePrincipal.id
    roleDefinitionId: resourceId('Microsoft.Authorization/roleDefinitions', storageBlobDataReaderRoleId)
  }
}
