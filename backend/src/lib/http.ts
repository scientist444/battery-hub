import { createHash, timingSafeEqual } from 'crypto';
import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ZodError, ZodTypeAny, z } from 'zod';
import { getSecret } from './secrets';

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): HttpResponseInit {
  return { status, jsonBody: body, headers: { 'Cache-Control': 'no-store', ...headers } };
}

function safeEqual(a: string, b: string) {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

export type Access = 'storefront' | 'admin';

/**
 * The storefront and admin panel call the API from Vercel's servers with a shared key
 * (Key Vault secrets `storefront-api-key` and `admin-api-key`). Browsers never see the keys.
 */
async function authorize(request: HttpRequest, access: Access) {
  const provided = request.headers.get('x-api-key') ?? '';
  const adminKey = await getSecret('admin-api-key');
  if (adminKey && provided && safeEqual(provided, adminKey)) return 'admin';
  if (access === 'storefront') {
    const storefrontKey = await getSecret('storefront-api-key');
    if (storefrontKey && provided && safeEqual(provided, storefrontKey)) return 'storefront';
  }
  throw new HttpError(401, 'Missing or invalid API key.');
}

type Handler = (request: HttpRequest, context: InvocationContext, caller: Access) => Promise<HttpResponseInit>;

/** Wraps a handler with API-key checks and consistent error responses. */
export function route(access: Access, handler: Handler) {
  return async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    let caller: Access | undefined;
    try {
      caller = await authorize(request, access);
      return await handler(request, context, caller);
    } catch (error) {
      if (error instanceof HttpError) {
        return json({ error: error.message, details: error.details }, error.status);
      }
      if (error instanceof ZodError) {
        return json({ error: 'Invalid request.', details: error.flatten() }, 400);
      }
      context.error('Unhandled error', error);
      // The admin panel gets the cause so problems can be fixed; customers only see a code.
      const e = (error ?? {}) as { code?: string | number; name?: string; message?: string };
      const code = String(e.code ?? e.name ?? 'unknown');
      const detail = caller === 'admin' ? `${code}: ${String(e.message ?? '').slice(0, 300)}` : code;
      return json({ error: `Something went wrong (${detail}). Please try again.` }, 500);
    }
  };
}

export async function parseBody<S extends ZodTypeAny>(request: HttpRequest, schema: S): Promise<z.output<S>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new HttpError(400, 'Request body must be JSON.');
  }
  return schema.parse(body);
}
