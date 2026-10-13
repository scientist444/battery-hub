'use server';

import { createHash, timingSafeEqual } from 'crypto';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath, revalidateTag } from 'next/cache';
import { ADMIN_COOKIE, SESSION_TTL_SECONDS, createSessionToken, isAdminConfigured } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin-session';
import { CATALOG_TAG, deleteOverride, saveOverride } from '@/lib/catalog';
import { getRedis } from '@/lib/redis';
import { products } from '@/data/products';

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

function refreshStorefront() {
  revalidateTag(CATALOG_TAG);
  revalidatePath('/', 'layout');
}

export async function updateProduct(formData: FormData): Promise<UpdateResult> {
  await requireAdmin();

  const id = String(formData.get('id') ?? '');
  if (!products.some((product) => product.id === id)) return { ok: false, message: 'Unknown product.' };

  const price = parseWholeNumber(formData.get('price'));
  const stock = parseWholeNumber(formData.get('stock'));
  if (Number.isNaN(price) || (price !== undefined && price > 10_000_000)) {
    return { ok: false, message: 'Price must be a whole number of rupees.' };
  }
  if (Number.isNaN(stock) || (stock !== undefined && stock > 100_000)) {
    return { ok: false, message: 'Stock must be a whole number.' };
  }

  try {
    if (price === undefined && stock === undefined) {
      await deleteOverride(id);
    } else {
      await saveOverride(id, { price, stock });
    }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Save failed.' };
  }

  refreshStorefront();
  return { ok: true, message: 'Saved' };
}

export async function resetProduct(id: string): Promise<UpdateResult> {
  await requireAdmin();
  try {
    await deleteOverride(id);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Reset failed.' };
  }
  refreshStorefront();
  return { ok: true, message: 'Reset to catalog defaults' };
}
