import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { container, queryAll } from './cosmos';
import { Category, Product, Supplier } from './types';

const CACHE_MS = 60 * 1000;
let products: { value: Product[]; at: number } | undefined;
let suppliers: { value: Supplier[]; at: number } | undefined;

// Built at deploy time from the storefront catalog (scripts/build-seed.ts).
const SEED_PATH = join(__dirname, '..', '..', 'seed.json');

/** First run on an empty database: load the categories and products bundled with the deployment. */
async function seedIfEmpty(): Promise<Product[]> {
  if (!existsSync(SEED_PATH)) return [];
  const seed = JSON.parse(readFileSync(SEED_PATH, 'utf8')) as { categories: Category[]; products: Omit<Product, 'updatedAt'>[] };
  const now = new Date().toISOString();
  for (const category of seed.categories) await container('categories').items.upsert(category);
  const seeded = seed.products.map((p) => ({ ...p, updatedAt: now }));
  for (const product of seeded) await container('products').items.upsert(product);
  return seeded;
}

/** All products, cached in memory for a minute (a few dozen small documents). */
export async function getProducts(): Promise<Product[]> {
  if (products && Date.now() - products.at < CACHE_MS) return products.value;
  let value = await queryAll<Product>('products', 'SELECT * FROM c');
  if (value.length === 0) value = await seedIfEmpty();
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
