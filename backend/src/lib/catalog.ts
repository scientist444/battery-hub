import { container, queryAll } from './cosmos';
import { Category, Product, Supplier } from './types';

const CACHE_MS = 60 * 1000;
let products: { value: Product[]; at: number } | undefined;
let suppliers: { value: Supplier[]; at: number } | undefined;

/** All products, cached in memory for a minute (a few dozen small documents). */
export async function getProducts(): Promise<Product[]> {
  if (products && Date.now() - products.at < CACHE_MS) return products.value;
  const value = await queryAll<Product>('products', 'SELECT * FROM c');
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
