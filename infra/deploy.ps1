# Deploys the BatteryHUB backend to Azure.
# Usage (from this folder, after `az login`):
#   .\deploy.ps1 -Preview     # show what would be created, change nothing
#   .\deploy.ps1              # create or update everything
param(
  [string]$ResourceGroup = 'rg-batteryhub-prod',
  [string]$Location = 'uaenorth',
  [switch]$Preview
)
$ErrorActionPreference = 'Stop'

$account = az account show --query "{name:name, id:id, user:user.name}" -o json | ConvertFrom-Json
if (-not $account) { throw 'Not signed in. Run: az login' }
Write-Host "Subscription: $($account.name) ($($account.id)) as $($account.user)"

$params = Get-Content "$PSScriptRoot\main.parameters.json" -Raw
if ($params -match 'REPLACE-WITH') { throw 'Fill in your email and Vercel domain in main.parameters.json first.' }

# New subscriptions often need these providers switched on once.
foreach ($ns in 'Microsoft.Web','Microsoft.Storage','Microsoft.DocumentDB','Microsoft.KeyVault','Microsoft.Insights','Microsoft.OperationalInsights','Microsoft.Consumption') {
  az provider register --namespace $ns --output none
}

az group create --name $ResourceGroup --location $Location --tags app=batteryhub --output none

$common = @('--resource-group', $ResourceGroup, '--template-file', "$PSScriptRoot\main.bicep", '--parameters', "@$PSScriptRoot\main.parameters.json")
if ($Preview) {
  az deployment group what-if @common
  return
}

az deployment group create @common --name "batteryhub-$(Get-Date -Format yyyyMMddHHmm)" --query properties.outputs -o json
