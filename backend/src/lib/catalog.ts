import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { container, isConflict, queryAll, readDoc } from './cosmos';
import { Category, Product, Supplier } from './types';

const CACHE_MS = 60 * 1000;
let products: { value: Product[]; at: number } | undefined;
let suppliers: { value: Supplier[]; at: number } | undefined;

// Built at deploy time from the storefront catalog (scripts/build-seed.ts).
const SEED_PATH = join(__dirname, '..', '..', 'seed.json');

/**
 * First run: load the categories and products bundled with the deployment. Only missing documents are
 * created (admin edits are never overwritten), and a marker in settings records that the seed finished,
 * so an interrupted run is completed by the next one.
 */
async function seedCatalog(existing: Product[]): Promise<Product[]> {
  if (!existsSync(SEED_PATH) || (await readDoc('settings', 'catalog-seeded'))) return existing;
  const seed = JSON.parse(readFileSync(SEED_PATH, 'utf8')) as { categories: Category[]; products: Omit<Product, 'updatedAt'>[] };
  const now = new Date().toISOString();
  const have = new Set(existing.map((p) => p.id));
  const missing = seed.products.filter((p) => !have.has(p.id)).map((p) => ({ ...p, updatedAt: now }));
  const createIfMissing = async (name: 'categories' | 'products', doc: { id: string }) => {
    try {
      await container(name).items.create(doc);
    } catch (error) {
      if (!isConflict(error)) throw error;
    }
  };
  await Promise.all([...seed.categories.map((c) => createIfMissing('categories', c)), ...missing.map((p) => createIfMissing('products', p))]);
  await container('settings').items.upsert({ id: 'catalog-seeded', at: now, products: seed.products.length });
  return [...existing, ...missing];
}

/** All products, cached in memory for a minute (a few dozen small documents). */
export async function getProducts(): Promise<Product[]> {
  if (products && Date.now() - products.at < CACHE_MS) return products.value;
  let value = await queryAll<Product>('products', 'SELECT * FROM c');
  value = await seedCatalog(value);
  products = { value, at: Date.now() };
  return value;
}

export async function getSuppliers(): Promise<Supplier[]> {
  if (suppliers && Date.now() - suppliers.at < CACHE_MS) return suppliers.value;
  const value = await queryAll<Supplier>('suppliers', 'SELECT * FROM c');
  suppliers = { value, at: Date.now() };
  return value;
}

export async function getCategories(): Promise<Category[]> {
  const value = await queryAll<Category>('categories', 'SELECT * FROM c');
  return value.sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
}

export function invalidateCatalog() {
  products = undefined;
  suppliers = undefined;
}

export async function saveProduct(product: Product) {
  await container('products').items.upsert({ ...product, updatedAt: new Date().toISOString() });
  invalidateCatalog();
}

export async function saveSupplier(supplier: Supplier) {
  await container('suppliers').items.upsert({ ...supplier, updatedAt: new Date().toISOString() });
  invalidateCatalog();
}

/** Fields safe to show customers (no cost prices or supplier details). */
export function publicProduct(product: Product) {
  const { suppliers: _suppliers, ...rest } = product;
  return rest;
}

export function primarySupplierId(product: Product, fallback?: string) {
  return (product.suppliers.find((s) => s.isPrimary) ?? product.suppliers[0])?.supplierId ?? fallback;
}
