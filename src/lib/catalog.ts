import { unstable_noStore as noStore } from 'next/cache';
import { products as baseProducts } from '@/data/products';
import { Product, ProductCategory, ProductOverride } from '@/types';
import { applyOverride } from '@/lib/catalog-merge';
import { getRedis } from '@/lib/redis';

const OVERRIDES_KEY = 'bh:product-overrides';

export async function getOverrides(): Promise<Record<string, ProductOverride>> {
  const redis = getRedis();
  if (!redis) return {};
  try {
    return (await redis.hgetall<Record<string, ProductOverride>>(OVERRIDES_KEY)) ?? {};
  } catch (error) {
    console.error('Failed to load product overrides', error);
    return {};
  }
}

export async function saveOverride(id: string, override: ProductOverride) {
  const redis = getRedis();
  if (!redis) throw new Error('Database is not connected.');
  await redis.hset(OVERRIDES_KEY, { [id]: { ...override, updatedAt: new Date().toISOString() } });
}

export async function deleteOverride(id: string) {
  const redis = getRedis();
  if (!redis) throw new Error('Database is not connected.');
  await redis.hdel(OVERRIDES_KEY, id);
}

export function mergeCatalog(overrides: Record<string, ProductOverride>): Product[] {
  return baseProducts.map((product) => applyOverride(product, overrides[product.id]));
}

/**
 * Storefront catalog with admin price/stock edits applied. Read fresh on every request so
 * admin saves show up immediately (one small Redis read per page).
 */
export async function getCatalog() {
  noStore();
  return mergeCatalog(await getOverrides());
}

export async function getProduct(slugOrId: string) {
  const catalog = await getCatalog();
  return catalog.find((product) => product.slug === slugOrId || product.id === slugOrId);
}

export async function getProductsByCategory(category: ProductCategory) {
  const catalog = await getCatalog();
  return catalog.filter((product) => product.category === category);
}
