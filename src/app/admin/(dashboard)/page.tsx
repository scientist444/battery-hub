import type { Metadata } from 'next';
import { Plus } from 'lucide-react';
import { products } from '@/data/products';
import { getCatalogState } from '@/lib/catalog';
import { getRedis } from '@/lib/redis';
import { requireAdmin } from '@/lib/admin-session';
import { ButtonLink } from '@/components/ui/Button';
import { isBackendAdminEnabled } from '@/lib/backend';
import { SyncCatalogButton } from '@/components/admin/SyncCatalogButton';
import { ProductManager, type AdminProductRow } from '@/components/admin/ProductManager';
import { LowStockAlert } from '@/components/admin/LowStockAlert';
import { getRequests } from '@/app/admin/backend-actions';
import { apiProductId } from '@/lib/backend';
import { applyOverride } from '@/lib/catalog-merge';
import { LOW_STOCK_THRESHOLD } from '@/lib/stock';

export const metadata: Metadata = { title: 'Products' };
export const dynamic = 'force-dynamic';

export default async function AdminProductsPage() {
  await requireAdmin();
  const dbConnected = Boolean(getRedis());
  const { overrides, customProducts, hiddenIds } = await getCatalogState();
  const hidden = new Set(hiddenIds);

  const rows: AdminProductRow[] = [
    ...customProducts.map((product) => ({ product, override: overrides[product.id], custom: true, removed: false })),
    ...products.map((product) => ({
      product,
      override: overrides[product.id],
      custom: false,
      removed: hidden.has(product.id),
    })),
  ];

  // Products running low (stock is only tracked once set in the admin), and how many customers wait for each.
  const waiting: Record<string, number> = {};
  if (isBackendAdminEnabled()) {
    try {
      for (const alert of (await getRequests()).alerts) waiting[alert.productId] = (waiting[alert.productId] ?? 0) + 1;
    } catch (error) {
      console.error('Stock alerts unavailable', error);
    }
  }
  const lowStock = rows
    .filter((row) => !row.removed)
    .map((row) => applyOverride(row.product, row.override))
    .filter((product) => typeof product.stockQty === 'number' && product.stockQty <= LOW_STOCK_THRESHOLD)
    .map((product) => ({ name: product.name, stock: product.stockQty!, waiting: waiting[apiProductId(product.id)] ?? 0 }))
    .sort((a, b) => a.stock - b.stock);

  return (
    <div>
      <LowStockAlert items={lowStock} />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Products</h1>
          <p className="mt-1 text-sm text-slate-500">
            Add, remove, or update price, stock, weight and photos. Changes go live on the store right after saving.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isBackendAdminEnabled() && <SyncCatalogButton />}
          {dbConnected && (
            <ButtonLink href="/admin/products/new">
              <Plus className="h-4 w-4" /> Add product
            </ButtonLink>
          )}
        </div>
      </div>

      {!dbConnected && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Database not connected.</strong> Add an Upstash Redis database from the Vercel Marketplace
          (Storage tab) so the <code>KV_REST_API_URL</code> and <code>KV_REST_API_TOKEN</code> variables are set,
          then redeploy. Until then, saving is disabled and the store shows the catalog defaults.
        </div>
      )}

      <ProductManager rows={rows} disabled={!dbConnected} uploadsEnabled={Boolean(process.env.BLOB_READ_WRITE_TOKEN)} />
    </div>
  );
}
