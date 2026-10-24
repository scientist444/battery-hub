# BatteryHUB backend on Azure

The website stays on Vercel. This folder creates the backend on Azure, using only serverless and free-tier services so a US$100 credit lasts 12 months.

## What gets created

| Resource | Plan | Monthly cost at current volume |
| --- | --- | --- |
| Azure Functions (API, checkout, Trax booking) | Consumption (Y1), Node 20 | US$0. 1M executions and 400,000 GB-s free each month |
| Cosmos DB (products, categories, suppliers, orders, customers, delivery rates, settings) | Free tier, 1000 RU/s shared, capped at 1000 so it can never bill throughput | US$0 up to 25 GB |
| Storage account (function code, `product-images` public container, `shipping-labels` private container, `orders-to-book` queue) | Standard LRS | about US$0.50–2 |
| Key Vault (Trax API key and other secrets) | Standard, pay per operation | a few cents |
| Application Insights + Log Analytics | Pay as you go, capped at 0.1 GB of logs a day | US$0 (inside 5 GB free) |
| Budget alert | US$8 a month, emails at 50%, 100% and forecast 100% | free |

No VMs, no App Service plans, no SQL databases, no fixed monthly charge.

## Rules worth knowing

- **Cosmos DB free tier is one per subscription** and must be chosen when the account is created. If the subscription already has a free-tier Cosmos account, the deployment fails on Cosmos; delete the old one or tell me.
- **No keys in code.** The Function App signs in to Cosmos DB and Key Vault with its own managed identity. Cosmos DB key access is turned off.
- The storage account keeps key access on because the Consumption plan stores the function code on an Azure Files share that needs it.

## Deploy

1. Install the Azure CLI: https://aka.ms/installazurecliwindows
2. Sign in: `az login` (pick the subscription with the credit: `az account set --subscription "<name>"`)
3. In `main.parameters.json`, set your email and your Vercel domain.
4. Preview, which changes nothing: `.\deploy.ps1 -Preview`
5. Deploy: `.\deploy.ps1`

The deployment prints the API address, Cosmos DB endpoint and images URL at the end.

## After deploying

- Add the Trax API key when you have it: `az keyvault secret set --vault-name <keyVaultName> --name trax-api-key --value <key>`
- To give yourself access to secrets in the portal, assign yourself the "Key Vault Secrets Officer" role on the vault.
- Check spend after the first week in the Azure portal under Cost Management.
