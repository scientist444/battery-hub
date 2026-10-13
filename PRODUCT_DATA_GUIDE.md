# Battery HUB Product Data Guide

Product data is generated into `src/data/products.ts` from a product file in the project root.
The importer looks for `products.csv` first, then `BatteryHub,pk.xlsx`.

Run the importer after editing the spreadsheet:

```bash
npm run import:products
```

## Expected Columns

Use these exact column names:

```csv
ID,NAME,CATEGORY,VOLTAGE,CURRENT,CAPACITY,CHEMISTRY,CONNECTOR,STOCK,PRICE
```

Do not guess specs. Add only confirmed voltage, current, capacity, chemistry/type, connector,
stock, and price values.

## Images

Place product images in:

```text
public/products
```

Recommended image path format:

```text
/products/image-name.jpg
```

Best image filename format is the product ID, for example:

```text
ps-12v-33a-400w.jpg
```

The importer matches images by product ID first, then product name. Supported image extensions are
`.jpg`, `.jpeg`, `.png`, and `.webp`. If no image is matched, the product remains in the catalog
with `/products/placeholder.svg`.

## Categories

Spreadsheet categories are normalized for the website into:

- Batteries
- Chargers
- Power Supplies
- Adapters
- BMS Boards

Only categories that actually contain products are shown in navigation and product filters.
Rows that cannot be normalized into one of these categories are skipped and listed in
`scripts/import-products-report.json`.

## WhatsApp Orders

The WhatsApp number is stored in `src/config/store.ts`.

Every generated product gets this order message:

```text
Assalam o Alaikum, I want to order [PRODUCT NAME]. Product ID: [ID]. Please confirm price and availability.
```

## Import Report

After every import, check:

```text
scripts/import-products-report.json
```

It reports the source file, imported product count, matched image count, missing images, missing
spec fields, and category counts. Fix missing images by renaming files to match product IDs or names.

## Admin Panel (price & stock)

The owner can change price and stock without editing code at `/admin`. It has its own login,
completely separate from the customer store, and is hidden from search engines.

One-time setup in Vercel (Project > Settings / Storage):

1. **Storage > Connect Database > Upstash for Redis** (free tier is enough). This adds
   `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically.
2. **Settings > Environment Variables**, add:
   - `ADMIN_USERNAME` - your admin username
   - `ADMIN_PASSWORD` - a strong password
   - `ADMIN_SESSION_SECRET` - random text of at least 32 characters
3. Redeploy.

How it works:

- Leave a field empty to use the value from `src/data/products.ts`.
- Stock is a unit count: `0` shows **Sold out** and disables Add to Cart, `1-5` shows
  **Only N left**, and customers cannot add more than the units in stock.
- The reset button removes your edit and goes back to the spreadsheet values.
- Edits are stored in Redis, so running `npm run import:products` again does not overwrite them.

See `.env.example` for the variable list.
