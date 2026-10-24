import { unstable_noStore as noStore } from 'next/cache';
import { products as baseProducts } from '@/data/products';
import { Product, ProductCategory, ProductOverride } from '@/types';
import { applyOverride } from '@/lib/catalog-merge';
import { getRedis } from '@/lib/redis';
import { apiProductId } from '@/lib/backend';
import { getReviewsOverview } from '@/lib/reviews';

const OVERRIDES_KEY = 'bh:product-overrides';
/** Products created from the admin panel, keyed by id. */
const CUSTOM_PRODUCTS_KEY = 'bh:custom-products';
/** Ids of spreadsheet products the admin has removed from the store. */
const HIDDEN_PRODUCTS_KEY = 'bh:hidden-products';

export interface CatalogState {
  overrides: Record<string, ProductOverride>;
  customProducts: Product[];
  hiddenIds: string[];
}

export async function getCatalogState(): Promise<CatalogState> {
  const redis = getRedis();
  if (!redis) return { overrides: {}, customProducts: [], hiddenIds: [] };
  try {
    const [overrides, custom, hidden] = await Promise.all([
      redis.hgetall<Record<string, ProductOverride>>(OVERRIDES_KEY),
      redis.hgetall<Record<string, Product>>(CUSTOM_PRODUCTS_KEY),
      redis.smembers(HIDDEN_PRODUCTS_KEY),
    ]);
    const customProducts = Object.values(custom ?? {}).sort((a, b) => a.name.localeCompare(b.name));
    return { overrides: overrides ?? {}, customProducts, hiddenIds: hidden ?? [] };
  } catch (error) {
    console.error('Failed to load catalog state', error);
    return { overrides: {}, customProducts: [], hiddenIds: [] };
  }
}

function requireRedis() {
  const redis = getRedis();
  if (!redis) throw new Error('Database is not connected.');
  return redis;
}

export async function saveOverride(id: string, override: ProductOverride) {
  await requireRedis().hset(OVERRIDES_KEY, { [id]: { ...override, updatedAt: new Date().toISOString() } });
}

export async function deleteOverride(id: string) {
  await requireRedis().hdel(OVERRIDES_KEY, id);
}

export async function saveCustomProduct(product: Product) {
  await requireRedis().hset(CUSTOM_PRODUCTS_KEY, { [product.id]: product });
}

export async function deleteCustomProduct(id: string) {
  const redis = requireRedis();
  await Promise.all([redis.hdel(CUSTOM_PRODUCTS_KEY, id), redis.hdel(OVERRIDES_KEY, id)]);
}

export async function setProductHidden(id: string, hidden: boolean) {
  const redis = requireRedis();
  if (hidden) await redis.sadd(HIDDEN_PRODUCTS_KEY, id);
  else await redis.srem(HIDDEN_PRODUCTS_KEY, id);
}

export function isBaseProduct(id: string) {
  return baseProducts.some((product) => product.id === id);
}

/** Spreadsheet products (minus removed ones) plus admin-created products, with price/stock edits applied. */
export function mergeCatalog({ overrides, customProducts, hiddenIds }: CatalogState): Product[] {
  const hidden = new Set(hiddenIds);
  return [...baseProducts.filter((product) => !hidden.has(product.id)), ...customProducts].map((product) =>
    applyOverride(product, overrides[product.id]),
  );
}

/**
 * Storefront catalog. Read fresh on every request so admin changes show up immediately
 * (a few small Redis reads per page).
 */
export async function getCatalog() {
  noStore();
  const [state, reviews] = await Promise.all([getCatalogState(), getReviewsOverview()]);
  return mergeCatalog(state).map((product) => {
    const rating = reviews.products[apiProductId(product.id)];
    return rating?.count ? { ...product, rating } : product;
  });
}

export async function getProduct(slugOrId: string) {
  const catalog = await getCatalog();
  return catalog.find((product) => product.slug === slugOrId || product.id === slugOrId);
}

export async function getProductsByCategory(category: ProductCategory) {
  const catalog = await getCatalog();
  return catalog.filter((product) => product.category === category);
}
