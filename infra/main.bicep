// BatteryHUB backend on Azure: serverless, free-tier first.
// The storefront stays on Vercel and calls the Function App API server to server.
// Target cost: US$0-5/month so a US$100 credit lasts 12 months.

targetScope = 'resourceGroup'

@description('Azure region. UAE North is the closest region to Pakistan.')
param location string = resourceGroup().location

@description('Short name used in every resource name.')
@minLength(3)
@maxLength(12)
param appName string = 'batteryhub'

@description('Environment label, e.g. prod or staging.')
@allowed([ 'prod', 'staging' ])
param env string = 'prod'

@description('Origins allowed to call the API from a browser, e.g. the Vercel site.')
param allowedOrigins array = []

@description('Use the Cosmos DB free tier (one per subscription). Set false to use serverless Cosmos DB instead, billed per request (cents a month at current volume).')
param useCosmosFreeTier bool = true

@description('Create the monthly budget alert. Some credit offers do not support budgets; set false if the deployment fails on it.')
param deployBudget bool = true

@description('Monthly budget in USD. US$100 over 12 months is about US$8.')
param monthlyBudgetUsd int = 8

@description('Email addresses that receive budget alerts.')
param budgetEmails array = []

@description('First day of the current month, used as the budget start date.')
param budgetStartDate string = '${utcNow('yyyy-MM')}-01'

var suffix = uniqueString(resourceGroup().id)
var baseName = '${appName}-${env}'
var storageName = take(toLower('st${appName}${env}${suffix}'), 24)
var contentShare = toLower('${baseName}-content')
var tags = {
  app: appName
  env: env
  costTarget: 'free-tier'
}

// ---------- Monitoring (capped so logs can never run up a bill) ----------

resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'log-${baseName}'
  location: location
  tags: tags
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
    workspaceCapping: { dailyQuotaGb: json('0.1') }
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-${baseName}'
  location: location
  kind: 'web'
  tags: tags
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logs.id
    SamplingPercentage: 50
    DisableLocalAuth: false
  }
}

// ---------- Storage: function package, product images, labels, order queue ----------

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageName
  location: location
  tags: tags
  kind: 'StorageV2'
  sku: { name: 'Standard_LRS' }
  properties: {
    accessTier: 'Hot'
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    // The Consumption plan keeps the function code on an Azure Files share, which needs the account key.
    allowSharedKeyAccess: true
    // Only the product-images container is public; everything else stays private.
    allowBlobPublicAccess: true
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
}

resource imagesContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: 'product-images'
  properties: { publicAccess: 'Blob' }
}

resource labelsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: 'shipping-labels'
}

resource queueService 'Microsoft.Storage/storageAccounts/queueServices@2023-05-01' = {
  parent: storage
  name: 'default'
}

resource ordersQueue 'Microsoft.Storage/storageAccounts/queueServices/queues@2023-05-01' = {
  parent: queueService
  name: 'orders-to-book'
}

// ---------- Secrets ----------

resource vault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: take('kv-${appName}-${env}-${suffix}', 24)
  location: location
  tags: tags
  properties: {
    tenantId: subscription().tenantId
    sku: { family: 'A', name: 'standard' }
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
  }
}

// ---------- Database: Cosmos DB free tier (1000 RU/s and 25 GB free, one per subscription) ----------

resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: 'cosmos-${baseName}-${suffix}'
  location: location
  tags: tags
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    enableFreeTier: useCosmosFreeTier
    capabilities: useCosmosFreeTier ? [] : [ { name: 'EnableServerless' } ]
    // Keys are disabled; the API signs in with its managed identity.
    disableLocalAuth: true
    minimalTlsVersion: 'Tls12'
    consistencyPolicy: { defaultConsistencyLevel: 'Session' }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    backupPolicy: {
      type: 'Periodic'
      periodicModeProperties: {
        backupIntervalInMinutes: 240
        backupRetentionIntervalInHours: 8
        backupStorageRedundancy: 'Local'
      }
    }
    // Free tier: hard cap at the free allowance, so throughput can never be billed.
    capacity: useCosmosFreeTier ? { totalThroughputLimit: 1000 } : null
  }
}

resource cosmosDb 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-05-15' = {
  parent: cosmos
  name: 'batteryhub'
  properties: {
    resource: { id: 'batteryhub' }
    // All containers share this throughput, which stays inside the free tier.
    options: useCosmosFreeTier ? { throughput: 1000 } : {}
  }
}

var containers = [
  { name: 'products', key: '/categoryId' }
  { name: 'categories', key: '/id' }
  { name: 'suppliers', key: '/id' }
  { name: 'orders', key: '/id' }
  { name: 'customers', key: '/phone' }
  { name: 'deliveryRates', key: '/cityId' }
  { name: 'settings', key: '/id' }
]

resource cosmosContainers 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = [for c in containers: {
  parent: cosmosDb
  name: c.name
  properties: {
    resource: {
      id: c.name
      partitionKey: {
        paths: [ c.key ]
        kind: 'Hash'
      }
    }
  }
}]

// ---------- API: Azure Functions Consumption plan (1M free executions a month, no fixed cost) ----------

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: 'plan-${baseName}'
  location: location
  tags: tags
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
}

var storageConnection = 'DefaultEndpointsProtocol=https;AccountName=${storage.name};EndpointSuffix=${environment().suffixes.storage};AccountKey=${storage.listKeys().keys[0].value}'

resource api 'Microsoft.Web/sites@2023-12-01' = {
  name: 'func-${baseName}-${suffix}'
  location: location
  tags: tags
  kind: 'functionapp'
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      use32BitWorkerProcess: false
      cors: {
        allowedOrigins: allowedOrigins
      }
      appSettings: [
        { name: 'AzureWebJobsStorage', value: storageConnection }
        { name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING', value: storageConnection }
        { name: 'WEBSITE_CONTENTSHARE', value: contentShare }
        { name: 'FUNCTIONS_EXTENSION_VERSION', value: '~4' }
        { name: 'FUNCTIONS_WORKER_RUNTIME', value: 'node' }
        { name: 'WEBSITE_NODE_DEFAULT_VERSION', value: '~20' }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsights.properties.ConnectionString }
        { name: 'KEY_VAULT_URI', value: vault.properties.vaultUri }
        { name: 'COSMOS_ENDPOINT', value: cosmos.properties.documentEndpoint }
        { name: 'COSMOS_DATABASE', value: cosmosDb.name }
        { name: 'ORDERS_QUEUE', value: ordersQueue.name }
        { name: 'IMAGES_BASE_URL', value: '${storage.properties.primaryEndpoints.blob}${imagesContainer.name}' }
        { name: 'LABELS_CONTAINER', value: labelsContainer.name }
      ]
    }
  }
}

// ---------- Access for the API's managed identity (no keys stored anywhere) ----------

var roles = {
  blobDataOwner: 'b7e6dc6d-f1e8-4753-8033-0f276bb0955b'
  queueDataContributor: '974c5e8b-45b9-4653-ba55-5f855dd0fb88'
  keyVaultSecretsUser: '4633458b-17de-408a-b874-0445c86b69e6'
}

resource apiBlobRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: storage
  name: guid(storage.id, api.id, roles.blobDataOwner)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roles.blobDataOwner)
    principalId: api.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource apiQueueRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: storage
  name: guid(storage.id, api.id, roles.queueDataContributor)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roles.queueDataContributor)
    principalId: api.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource apiVaultRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: vault
  name: guid(vault.id, api.id, roles.keyVaultSecretsUser)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roles.keyVaultSecretsUser)
    principalId: api.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Cosmos DB data access for the API (built-in Data Contributor role).
resource apiCosmosRole 'Microsoft.DocumentDB/databaseAccounts/sqlRoleAssignments@2024-05-15' = {
  parent: cosmos
  name: guid(cosmos.id, api.id, 'data-contributor')
  properties: {
    roleDefinitionId: '${cosmos.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002'
    principalId: api.identity.principalId
    scope: cosmos.id
  }
}

// ---------- Budget alert ----------

resource budget 'Microsoft.Consumption/budgets@2023-11-01' = if (deployBudget && !empty(budgetEmails)) {
  name: 'budget-${baseName}'
  properties: {
    category: 'Cost'
    amount: monthlyBudgetUsd
    timeGrain: 'Monthly'
    timePeriod: { startDate: budgetStartDate }
    notifications: {
      actual50: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 50
        thresholdType: 'Actual'
        contactEmails: budgetEmails
      }
      actual100: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 100
        thresholdType: 'Actual'
        contactEmails: budgetEmails
      }
      forecast100: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 100
        thresholdType: 'Forecasted'
        contactEmails: budgetEmails
      }
    }
  }
}

output apiName string = api.name
output apiUrl string = 'https://${api.properties.defaultHostName}'
output cosmosEndpoint string = cosmos.properties.documentEndpoint
output cosmosAccountName string = cosmos.name
output storageAccountName string = storage.name
output imagesBaseUrl string = '${storage.properties.primaryEndpoints.blob}${imagesContainer.name}'
output keyVaultName string = vault.name
output keyVaultUri string = vault.properties.vaultUri
