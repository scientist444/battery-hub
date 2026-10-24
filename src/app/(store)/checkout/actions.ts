'use server';

import { BackendError, apiProductId, backendFetch } from '@/lib/backend';

export interface CheckoutCity {
  id: string;
  name: string;
  province: string;
}

export interface CartLineInput {
  /** Website product ID (as in the cart). */
  productId: string;
  qty: number;
}

export interface DeliveryOption {
  code: string;
  name: string;
  etaDays?: string;
  feePkr: number;
}

export interface CheckoutQuote {
  city: { id: string; name: string };
  items: { productId: string; name: string; unitPricePkr: number; qty: number }[];
  shipments: { itemIndexes: number[]; weightG: number; options: DeliveryOption[]; chosen: DeliveryOption }[];
  subtotalPkr: number;
  deliveryFeePkr: number;
  totalPkr: number;
  paymentMethods: string[];
}

export interface CustomerInput {
  name: string;
  phone: string;
  email?: string;
  cityId: string;
  address: string;
  landmark?: string;
}

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; quote?: CheckoutQuote };

function toApiLines(items: CartLineInput[]) {
  return items.map((item) => ({ productId: apiProductId(item.productId), qty: item.qty }));
}

/** First readable message from an API error, including field errors from validation. */
function message(error: unknown) {
  if (!(error instanceof BackendError)) {
    console.error('Checkout error', error);
    return 'Something went wrong. Please try again.';
  }
  const details = error.details as { fieldErrors?: Record<string, string[]> } | undefined;
  const fieldError = details?.fieldErrors && Object.values(details.fieldErrors).flat()[0];
  return error.status === 400 && fieldError ? fieldError : error.message;
}

export async function getCheckoutCities(): Promise<ActionResult<CheckoutCity[]>> {
  try {
    const { cities } = await backendFetch<{ cities: CheckoutCity[] }>('storefront', 'cities');
    return { ok: true, data: cities };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}

export async function getDeliveryQuote(items: CartLineInput[], cityId: string, service?: string): Promise<ActionResult<CheckoutQuote>> {
  try {
    const quote = await backendFetch<CheckoutQuote>('storefront', 'checkout/quote', {
      body: { items: toApiLines(items), cityId, service },
    });
    return { ok: true, data: quote };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}

export interface PlacedOrder {
  orderNumber: string;
  status: string;
  subtotalPkr: number;
  deliveryFeePkr: number;
  totalPkr: number;
  paymentMethod: string;
}

export async function placeOrder(input: {
  items: CartLineInput[];
  customer: CustomerInput;
  notes?: string;
  service?: string;
  expectedTotalPkr: number;
}): Promise<ActionResult<PlacedOrder>> {
  try {
    const order = await backendFetch<PlacedOrder>('storefront', 'orders', {
      body: { ...input, items: toApiLines(input.items), notes: input.notes || undefined },
    });
    return { ok: true, data: order };
  } catch (error) {
    // 409 with a quote: prices or delivery changed since the customer looked. Show the new total.
    const quote = error instanceof BackendError && error.status === 409 ? (error.details as CheckoutQuote | undefined) : undefined;
    return { ok: false, error: message(error), quote: quote?.totalPkr !== undefined ? quote : undefined };
  }
}

export interface TrackedOrder {
  orderNumber: string;
  status: string;
  placedAt: string;
  totalPkr: number;
  items: { name: string; qty: number }[];
  shipments: { status: string; trackingNumber?: string; courier?: string; events: { message: string; at: string }[] }[];
}

export async function trackOrder(orderNumber: string, phone: string): Promise<ActionResult<TrackedOrder>> {
  try {
    const order = await backendFetch<TrackedOrder>('storefront', 'track', { query: { order: orderNumber, phone } });
    return { ok: true, data: order };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}
