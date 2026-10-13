import type { Metadata } from 'next';
import { products } from '@/data/products';
import { getOverrides } from '@/lib/catalog';
import { getRedis } from '@/lib/redis';
import { requireAdmin } from '@/lib/admin-session';
import { ProductManager } from '@/components/admin/ProductManager';

export const metadata: Metadata = { title: 'Products' };
export const dynamic = 'force-dynamic';

export default async function AdminProductsPage() {
  await requireAdmin();
  const dbConnected = Boolean(getRedis());
  const overrides = await getOverrides();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-950">Products</h1>
        <p className="mt-1 text-sm text-slate-500">
          Update price and stock. Changes go live on the store right after saving.
        </p>
      </div>

      {!dbConnected && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Database not connected.</strong> Add an Upstash Redis database from the Vercel Marketplace
          (Storage tab) so the <code>KV_REST_API_URL</code> and <code>KV_REST_API_TOKEN</code> variables are set,
          then redeploy. Until then, saving is disabled and the store shows the catalog defaults.
        </div>
      )}

      <ProductManager products={products} overrides={overrides} disabled={!dbConnected} />
    </div>
  );
}
