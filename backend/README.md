# BatteryHUB API

Azure Functions (Consumption plan, Node 20) with Cosmos DB. The Vercel site calls it server to server with an API key.

## Endpoints

All requests send `x-api-key`. Storefront routes accept the storefront or admin key; `manage/*` routes need the admin key. Keys live in Key Vault as `storefront-api-key` and `admin-api-key`.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/products`, `/api/products/{slug}`, `/api/categories`, `/api/cities` | Catalog for the website |
| POST | `/api/checkout/quote` | Cart + city → delivery options, delivery charge, total |
| POST | `/api/orders` | Place a COD order (refused with the new quote if the total changed) |
| GET | `/api/track?order=BH-10001&phone=03001234567` | Order tracking for customers |
| GET/POST | `/api/manage/products`, `/api/manage/categories`, `/api/manage/suppliers` | Admin catalog |
| POST | `/api/manage/products/{id}/stock` | Set stock (null = not tracked) |
| GET | `/api/manage/orders?status=&q=` and `/api/manage/orders/{id}` | Orders |
| POST | `/api/manage/orders/{id}/status` | Hold, confirm, cancel, delivered, returned (stock goes back on cancel/return) |
| POST | `/api/manage/orders/{id}/book` | Book with Trax now |
| POST | `/api/manage/orders/{id}/tracking` | Add a tracking number from a manual Trax booking |
| POST | `/api/manage/orders/{id}/refresh` | Pull latest Trax status |
| GET | `/api/manage/orders/{id}/shipments/{index}/label` | Trax label PDF |
| GET/PATCH | `/api/manage/settings` | Courier mode, services, weight rules, flat fees, hold limits |
| POST | `/api/manage/cities/sync` | Match cities to Trax city IDs |
| POST | `/api/manage/import` | Bulk load categories, suppliers, products |

Background: `bookOrder` (queue `orders-to-book`, 5 retries) and `refreshTracking` (every 45 minutes).

## Switching Trax on

1. `az keyvault secret set --vault-name kv-batteryhub-prod-txyfw --name trax-api-key --value <key>`
2. Confirm field names in `src/lib/shipping/trax.ts` against Trax's API document.
3. Add the supplier with its `traxPickupAddressId`, then `POST /api/manage/cities/sync`.
4. `PATCH /api/manage/settings` with `courierMode: "trax"`, the real service IDs and transport (road/air), and `autoBook: true`.

## Develop

```
npm ci
npm test
npm run seed > seed.json   # first import from src/data/products.ts
```
