'use server';

import { createHash, timingSafeEqual } from 'crypto';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { ADMIN_COOKIE, SESSION_TTL_SECONDS, createSessionToken, isAdminConfigured } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin-session';
import { syncCatalogQuietly } from '@/lib/backend-catalog';
import {
  deleteCustomProduct,
  deleteOverride,
  getCatalogState,
  isBaseProduct,
  saveCustomProduct,
  saveOverride,
  setProductHidden,
} from '@/lib/catalog';
import { getRedis } from '@/lib/redis';
import { deleteUploadedImages, isBlobConfigured, isUploadedImage, uploadProductImage } from '@/lib/blob';
import { formatRupees } from '@/lib/format';
import { stockStatusFromQty } from '@/lib/stock';
import { STORE_CATEGORIES, createProductOrderMessage } from '@/config/store';
import { products as baseProducts } from '@/data/products';
import { Product, ProductCategory } from '@/types';

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_SECONDS = 15 * 60;

function safeEqual(a: string, b: string) {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

export interface LoginState {
  error?: string;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!isAdminConfigured()) {
    return { error: 'Admin login is not configured. Set ADMIN_USERNAME, ADMIN_PASSWORD and ADMIN_SESSION_SECRET.' };
  }

  const redis = getRedis();
  const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const attemptsKey = `bh:login-attempts:${ip}`;
  if (redis) {
    const attempts = (await redis.get<number>(attemptsKey)) ?? 0;
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      return { error: 'Too many failed attempts. Try again in 15 minutes.' };
    }
  }

  const username = String(formData.get('username') ?? '');
  const password = String(formData.get('password') ?? '');
  const valid =
    safeEqual(username, process.env.ADMIN_USERNAME!) && safeEqual(password, process.env.ADMIN_PASSWORD!);

  if (!valid) {
    if (redis) {
      const count = await redis.incr(attemptsKey);
      if (count === 1) await redis.expire(attemptsKey, LOGIN_WINDOW_SECONDS);
    }
    return { error: 'Invalid username or password.' };
  }

  if (redis) await redis.del(attemptsKey);

  cookies().set(ADMIN_COOKIE, await createSessionToken(username), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  redirect('/admin');
}

export async function logout() {
  cookies().delete(ADMIN_COOKIE);
  redirect('/admin/login');
}

export interface UpdateResult {
  ok: boolean;
  message: string;
}

function parseWholeNumber(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim();
  if (text === '') return undefined;
  if (!/^\d+$/.test(text)) return NaN;
  return Number(text);
}

async function productExists(id: string) {
  if (isBaseProduct(id)) return true;
  const { customProducts } = await getCatalogState();
  return customProducts.some((product) => product.id === id);
}

async function refreshStorefront() {
  revalidatePath('/', 'layout');
  // Keep the ordering backend's prices and stock in step with the store.
  await syncCatalogQuietly();
}

export async function updateProduct(formData: FormData): Promise<UpdateResult> {
  await requireAdmin();

  const id = String(formData.get('id') ?? '');
  if (!(await productExists(id))) return { ok: false, message: 'Unknown product.' };

  const price = parseWholeNumber(formData.get('price'));
  const stock = parseWholeNumber(formData.get('stock'));
  const weightG = parseWholeNumber(formData.get('weight'));
  if (Number.isNaN(price) || (price !== undefined && price > 10_000_000)) {
    return { ok: false, message: 'Price must be a whole number of rupees.' };
  }
  if (Number.isNaN(stock) || (stock !== undefined && stock > 100_000)) {
    return { ok: false, message: 'Stock must be a whole number.' };
  }
  const weightError = checkWeight(weightG);
  if (weightError) return { ok: false, message: weightError };

  try {
    const state = await getCatalogState();
    const custom = state.customProducts.find((p) => p.id === id);
    // Admin-added products keep their weight on the product; spreadsheet products in the override.
    if (custom && custom.weightG !== weightG) await saveCustomProduct({ ...custom, weightG });
    const overrideWeight = custom ? undefined : weightG;
    // Photos are edited separately; keep them.
    const { images } = state.overrides[id] ?? {};
    if (price === undefined && stock === undefined && overrideWeight === undefined && !images) {
      await deleteOverride(id);
    } else {
      await saveOverride(id, { price, stock, weightG: overrideWeight, images });
    }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Save failed.' };
  }

  await refreshStorefront();
  return { ok: true, message: 'Saved' };
}

export async function resetProduct(id: string): Promise<UpdateResult> {
  await requireAdmin();
  try {
    // Photos uploaded for a spreadsheet product go back to the spreadsheet photos.
    const uploaded = isBaseProduct(id) ? ((await getCatalogState()).overrides[id]?.images ?? []).filter(isUploadedImage) : [];
    await deleteOverride(id);
    await deleteUploadedImages(uploaded);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Reset failed.' };
  }
  await refreshStorefront();
  return { ok: true, message: 'Reset to catalog defaults' };
}

function checkWeight(weightG: number | undefined) {
  if (Number.isNaN(weightG) || (weightG !== undefined && (weightG <= 0 || weightG > 100_000))) {
    return 'Weight must be in grams, e.g. 450 (1 kg = 1000 g).';
  }
}

function imageFiles(formData: FormData) {
  return formData.getAll('images').filter((value): value is File => value instanceof File && value.size > 0);
}

function checkImageFiles(files: File[]) {
  if (files.length > MAX_IMAGES) return `Upload at most ${MAX_IMAGES} photos.`;
  for (const file of files) {
    if (!file.type.startsWith('image/')) return `${file.name} is not an image.`;
    if (file.size > MAX_IMAGE_BYTES) return `${file.name} is larger than 4 MB.`;
  }
  if (files.length > 0 && !isBlobConfigured()) {
    return 'Photo upload needs Vercel Blob storage. Connect it in Vercel > Storage, then redeploy.';
  }
}

async function uploadImages(files: File[], slug: string) {
  return Promise.all(
    files.map((file) => uploadProductImage(`products/${slug}-${file.name}`, file)),
  );
}

/**
 * Change an existing product's photos. `order` lists the final photos, first = main:
 * `url:<existing photo>` keeps one, `new:<n>` is the n-th uploaded file.
 */
export async function updateProductPhotos(formData: FormData): Promise<UpdateResult> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  const state = await getCatalogState();
  const custom = state.customProducts.find((p) => p.id === id);
  const base = baseProducts.find((p) => p.id === id);
  const product = custom ?? base;
  if (!product) return { ok: false, message: 'Unknown product.' };

  const current = (!custom && state.overrides[id]?.images) || product.images;
  const files = imageFiles(formData);
  const order = formData.getAll('order').map(String);
  const fileError = checkImageFiles(files);
  if (fileError) return { ok: false, message: fileError };
  if (order.length === 0) return { ok: false, message: 'Keep at least one photo.' };
  // Spreadsheet products can already have more than the upload limit; they keep them.
  const limit = Math.max(MAX_IMAGES, current.length);
  if (order.length > limit) return { ok: false, message: `Use at most ${limit} photos.` };

  let uploaded: string[];
  try {
    uploaded = await uploadImages(files, product.slug);
  } catch (error) {
    console.error('Image upload failed', error);
    return { ok: false, message: 'Photo upload failed. Try smaller images or try again.' };
  }

  const images: string[] = [];
  for (const entry of order) {
    if (entry.startsWith('url:') && current.includes(entry.slice(4))) images.push(entry.slice(4));
    else if (entry.startsWith('new:') && uploaded[Number(entry.slice(4))]) images.push(uploaded[Number(entry.slice(4))]);
  }
  if (images.length === 0) return { ok: false, message: 'Keep at least one photo.' };

  try {
    if (custom) {
      // Admin-added products own their photos.
      await saveCustomProduct({ ...custom, images, image: images[0] });
    } else {
      const sameAsCatalog = images.join('\n') === product.images.join('\n');
      await saveOverride(id, { ...state.overrides[id], images: sameAsCatalog ? undefined : images });
    }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Save failed.' };
  }
  await deleteUploadedImages(current.filter((url) => !images.includes(url)));

  await refreshStorefront();
  return { ok: true, message: 'Photos saved' };
}

// Adding and removing products

const SAFETY_NOTES: Record<ProductCategory, string> = {
  batteries:
    'Use compatible charger only. Do not short-circuit. Do not overcharge or over-discharge. Confirm voltage and capacity before order.',
  chargers: 'Use only with compatible battery voltage and chemistry.',
  'power-supplies': 'Confirm voltage, current rating, wiring, and load requirement before order.',
  adapters: 'Confirm voltage, current rating, connector size, and polarity before order.',
  'bms-boards': 'Confirm cell count, battery chemistry, wiring sequence, and current rating before use.',
};

const SPEC_FIELDS = [
  ['voltage', 'Voltage'],
  ['current', 'Current'],
  ['capacity', 'Capacity / Power'],
  ['chemistry', 'Chemistry / Type'],
  ['connector', 'Connector'],
] as const;

const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 7);
}

function field(formData: FormData, key: string, max = 500) {
  return String(formData.get(key) ?? '').trim().slice(0, max);
}

export interface ProductFormState {
  error?: string;
}

export async function createProduct(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  await requireAdmin();
  if (!getRedis()) return { error: 'Database is not connected.' };

  const name = field(formData, 'name', 120);
  const category = field(formData, 'category') as ProductCategory;
  const price = parseWholeNumber(formData.get('price'));
  const stock = parseWholeNumber(formData.get('stock'));

  if (name.length < 3) return { error: 'Enter a product name.' };
  if (!STORE_CATEGORIES.some((c) => c.id === category)) return { error: 'Choose a category.' };
  if (price === undefined || Number.isNaN(price) || price <= 0) return { error: 'Enter a price in rupees.' };
  if (Number.isNaN(stock)) return { error: 'Stock must be a whole number.' };
  const weightG = parseWholeNumber(formData.get('weight'));
  const weightError = checkWeight(weightG);
  if (weightError) return { error: weightError };

  const files = imageFiles(formData);
  const fileError = checkImageFiles(files);
  if (fileError) return { error: fileError };

  const { customProducts } = await getCatalogState();
  const takenSlugs = new Set([...baseProducts, ...customProducts].map((p) => p.slug));
  const baseSlug = slugify(name) || 'product';
  const slug = takenSlugs.has(baseSlug) ? `${baseSlug}-${randomSuffix()}` : baseSlug;
  const id = `BH-${baseSlug.toUpperCase().slice(0, 24)}-${randomSuffix().toUpperCase()}`;

  let images: string[];
  try {
    images = await uploadImages(files, slug);
  } catch (error) {
    console.error('Image upload failed', error);
    return { error: 'Photo upload failed. Try smaller images or try again.' };
  }
  if (images.length === 0) images = ['/products/placeholder.svg'];

  const specs = SPEC_FIELDS.flatMap(([key, label]) => {
    const value = field(formData, key, 200);
    return value ? [`${label}: ${value}`] : [];
  });

  const product: Product = {
    id,
    slug,
    name,
    category,
    image: images[0],
    images,
    price: formatRupees(price),
    availability: 'Available in Islamabad & Rawalpindi',
    stockStatus: stock === undefined ? 'In Stock' : stockStatusFromQty(stock),
    stockQty: stock,
    weightG,
    specs,
    description: field(formData, 'description', 2000) || `${name}. Please confirm compatibility before ordering.`,
    whatsappText: createProductOrderMessage(name, id),
    safetyNote: SAFETY_NOTES[category],
    featured: formData.get('featured') === 'on',
  };

  try {
    await saveCustomProduct(product);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save the product.' };
  }

  await refreshStorefront();
  redirect('/admin');
}

/** Spreadsheet products are hidden (restorable); admin-created products are deleted. */
export async function removeProduct(id: string): Promise<UpdateResult> {
  await requireAdmin();
  try {
    if (isBaseProduct(id)) {
      await setProductHidden(id, true);
    } else {
      const { customProducts } = await getCatalogState();
      const product = customProducts.find((p) => p.id === id);
      if (!product) return { ok: false, message: 'Unknown product.' };
      await deleteCustomProduct(id);
      await deleteUploadedImages(product.images);
    }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Remove failed.' };
  }
  await refreshStorefront();
  return { ok: true, message: 'Removed' };
}

export async function restoreProduct(id: string): Promise<UpdateResult> {
  await requireAdmin();
  if (!isBaseProduct(id)) return { ok: false, message: 'Unknown product.' };
  try {
    await setProductHidden(id, false);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Restore failed.' };
  }
  await refreshStorefront();
  return { ok: true, message: 'Restored' };
}
