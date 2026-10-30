import { del, put } from '@vercel/blob';

/** Value of BLOB_<name>, or of a prefixed copy such as MYSTORE_BLOB_<name> (Vercel adds a prefix when asked). */
function blobEnv(name: string) {
  if (process.env[`BLOB_${name}`]) return process.env[`BLOB_${name}`];
  const key = Object.keys(process.env).find((k) => k.endsWith(`_BLOB_${name}`) && process.env[k]);
  return key ? process.env[key] : undefined;
}

/**
 * Product photos uploaded from the admin live in Vercel Blob. The store can be connected with a
 * read-write token (BLOB_READ_WRITE_TOKEN) or, for newer stores, with Vercel's own sign-in (BLOB_STORE_ID).
 */
export function blobAuth(): { token: string } | { storeId: string } | undefined {
  const token = blobEnv('READ_WRITE_TOKEN');
  if (token) return { token };
  const storeId = blobEnv('STORE_ID');
  return storeId ? { storeId } : undefined;
}

export function isBlobConfigured() {
  return Boolean(blobAuth());
}

/** Private-store photos are served by our /media route, which reads them with the store credentials. */
export const MEDIA_PREFIX = '/media/';

export async function uploadProductImage(pathname: string, file: File) {
  try {
    const blob = await put(pathname, file, { ...blobAuth(), access: 'private', addRandomSuffix: true });
    return `${MEDIA_PREFIX}${blob.pathname}`;
  } catch (error) {
    // A public store rejects private uploads; its files can be linked directly.
    if (!/public|private|access/i.test(String((error as Error).message))) throw error;
    return (await put(pathname, file, { ...blobAuth(), access: 'public', addRandomSuffix: true })).url;
  }
}

/** Photos we uploaded (as opposed to spreadsheet photos in /public). */
export function isUploadedImage(url: string) {
  return url.startsWith(MEDIA_PREFIX) || /^https:\/\/[^/]+\.blob\.vercel-storage\.com\//.test(url);
}

export async function deleteUploadedImages(urls: string[]) {
  const targets = urls.filter(isUploadedImage).map((url) => (url.startsWith(MEDIA_PREFIX) ? url.slice(MEDIA_PREFIX.length) : url));
  if (!targets.length || !isBlobConfigured()) return;
  await del(targets, blobAuth()).catch((error) => console.error('Failed to delete product images', error));
}
