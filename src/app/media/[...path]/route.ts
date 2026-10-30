import { get } from '@vercel/blob';
import { blobAuth } from '@/lib/blob';

/** Serves product photos from the private Blob store. Only product photos are reachable. */
export async function GET(_request: Request, { params }: { params: { path: string[] } }) {
  const pathname = params.path.map(decodeURIComponent).join('/');
  if (!pathname.startsWith('products/') || pathname.includes('..')) return new Response('Not found', { status: 404 });

  const result = await get(pathname, { ...blobAuth(), access: 'private' }).catch((error) => {
    console.error('Blob read failed', pathname, error);
    return null;
  });
  if (!result || result.statusCode !== 200) return new Response('Not found', { status: 404 });

  return new Response(result.stream, {
    headers: {
      'Content-Type': result.blob.contentType,
      // Uploads get a random suffix, so a path never changes content.
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
