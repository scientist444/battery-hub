import { apiProductId, backendFetch, isBackendAdminEnabled } from '@/lib/backend';
import { getCatalog } from '@/lib/catalog';
import { parsePrice } from '@/lib/format';
import { isInStock } from '@/lib/stock';

/**
 * Push the store's catalog (spreadsheet + admin-added products, with price/stock edits) to the API,
 * which prices orders from it. Products removed here are switched off there.
 */
export async function pushCatalog() {
  const catalog = await getCatalog();
  const products = catalog
    .filter((p) => parsePrice(p.price) > 0)
    .map((p) => ({
      id: apiProductId(p.id),
      categoryId: p.category,
      slug: p.slug,
      name: p.name.slice(0, 150),
      description: p.description.slice(0, 4000),
      specs: p.specs.slice(0, 30).map((s) => s.slice(0, 300)),
      safetyNote: p.safetyNote.slice(0, 500),
      images: p.images.slice(0, 12),
      pricePkr: parsePrice(p.price),
      stock: typeof p.stockQty === 'number' ? Math.max(p.stockQty, 0) : isInStock(p) ? null : 0,
      featured: Boolean(p.featured),
      // The admin owns weights; null lets the API use its estimate for the product.
      weightG: p.weightG ?? null,
    }));
  return backendFetch<{ created: number; updated: number; deactivated: number; unchanged: number }>('admin', 'manage/catalog/sync', {
    body: { products },
  });
}

/** Called after every product edit. A failed sync never blocks the edit; the dashboard button retries. */
export async function syncCatalogQuietly() {
  if (!isBackendAdminEnabled()) return;
  try {
    await pushCatalog();
  } catch (error) {
    console.error('Catalog sync to backend failed', error);
  }
}

