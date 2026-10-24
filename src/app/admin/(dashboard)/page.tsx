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

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Products</h1>
          <p className="mt-1 text-sm text-slate-500">
            Add, remove, or update price and stock. Changes go live on the store right after saving.
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

      <ProductManager rows={rows} disabled={!dbConnected} />
    </div>
  );
}
