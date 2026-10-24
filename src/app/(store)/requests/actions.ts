'use server';

import { BackendError, apiProductId, backendFetch } from '@/lib/backend';

export type RequestResult = { ok: boolean; message: string };

function failure(error: unknown): RequestResult {
  if (error instanceof BackendError) {
    const details = error.details as { fieldErrors?: Record<string, string[]> } | undefined;
    const field = details?.fieldErrors && Object.values(details.fieldErrors).flat()[0];
    return { ok: false, message: field ?? error.message };
  }
  console.error('Request failed', error);
  return { ok: false, message: 'Something went wrong. Please try again or message us on WhatsApp.' };
}

export async function requestStockAlert(input: { productId: string; productName: string; phone: string; name?: string }): Promise<RequestResult> {
  try {
    await backendFetch('storefront', 'stock-alerts', {
      body: { ...input, productId: apiProductId(input.productId), name: input.name?.trim() || undefined },
    });
    return { ok: true, message: 'Done! We will message you on WhatsApp when it is back in stock.' };
  } catch (error) {
    return failure(error);
  }
}

export async function requestQuote(_prev: RequestResult | undefined, form: FormData): Promise<RequestResult> {
  // Bots fill every field; people never see this one.
  if (String(form.get('website') ?? '')) return { ok: true, message: 'Thank you!' };
  const text = (key: string) => String(form.get(key) ?? '').trim();
  try {
    await backendFetch('storefront', 'quote-requests', {
      body: {
        name: text('name'),
        phone: text('phone'),
        organization: text('organization') || undefined,
        city: text('city'),
        details: text('details'),
      },
    });
    return { ok: true, message: 'Thank you! We will send your quote on WhatsApp, usually within one working day.' };
  } catch (error) {
    return failure(error);
  }
}
