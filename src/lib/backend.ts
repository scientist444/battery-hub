/**
 * Client for the BatteryHUB API on Azure Functions. Server-side only: the API keys never reach the browser.
 *
 *   BACKEND_API_URL        e.g. https://func-batteryhub-prod-xxxx.azurewebsites.net/api
 *   BACKEND_STOREFRONT_KEY Key Vault secret storefront-api-key (checkout, tracking)
 *   BACKEND_ADMIN_KEY      Key Vault secret admin-api-key (orders, supplier, catalog sync)
 */

type Access = 'storefront' | 'admin';

export class BackendError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

function config(access: Access) {
  const url = process.env.BACKEND_API_URL?.replace(/\/+$/, '');
  const key = access === 'admin' ? process.env.BACKEND_ADMIN_KEY : process.env.BACKEND_STOREFRONT_KEY;
  return url && key ? { url, key } : undefined;
}

/** True when online checkout can be offered. Until then the cart keeps the WhatsApp ordering flow. */
export function isCheckoutEnabled() {
  return Boolean(config('storefront'));
}

export function isBackendAdminEnabled() {
  return Boolean(config('admin'));
}

/** Cosmos DB IDs cannot contain / \ ? or #; the API stores products under this form of the website ID. */
export function apiProductId(id: string) {
  return id.replace(/[/\\?#]/g, '-');
}

export async function backendFetch<T>(
  access: Access,
  path: string,
  init: { method?: string; body?: unknown; query?: Record<string, string> } = {},
): Promise<T> {
  const cfg = config(access);
  if (!cfg) throw new BackendError(503, 'Online ordering is not set up yet.');
  const qs = init.query ? `?${new URLSearchParams(init.query)}` : '';

  let response: Response;
  try {
    response = await fetch(`${cfg.url}/${path}${qs}`, {
      method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
      headers: { 'x-api-key': cfg.key, ...(init.body === undefined ? {} : { 'content-type': 'application/json' }) },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    console.error(`Backend ${path} unreachable`, error);
    throw new BackendError(503, 'Our ordering service is not responding. Please try again in a minute.');
  }

  const data = (await response.json().catch(() => ({}))) as { error?: string; details?: unknown };
  if (!response.ok) {
    throw new BackendError(response.status, data.error ?? `Request failed (${response.status}).`, data.details);
  }
  return data as T;
}
