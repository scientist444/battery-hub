import { readFileSync } from 'fs';
import { join } from 'path';
import { app, output } from '@azure/functions';
import { getCategories, getProducts, publicProduct } from '../lib/catalog';
import { getCities, quoteContext } from '../lib/context';
import { getSecret } from '../lib/secrets';
import { HttpError, json, parseBody, route } from '../lib/http';
import { createOrder, findOrderByNumber } from '../lib/orders';
import { buildQuote, publicQuote } from '../lib/quote';
import { orderSchema, pkMobile, quoteSchema } from '../lib/validation';

// Commit SHA written at deploy time, so a health check can tell which build is serving.
const VERSION = (() => {
  try {
    return (JSON.parse(readFileSync(join(__dirname, '..', '..', 'version.json'), 'utf8')) as { sha: string }).sha;
  } catch {
    return 'dev';
  }
})();

const bookingQueue = output.storageQueue({ queueName: '%ORDERS_QUEUE%', connection: 'AzureWebJobsStorage' });

// Public health check: confirms the API, database and catalog are reachable. No API key, no private data.
app.http('health', {
  methods: ['GET'],
  route: 'health',
  authLevel: 'anonymous',
  handler: async (_request, context) => {
    try {
      const products = await getProducts();
      // Key Vault is needed for every keyed route; report whether the API keys can be read (never their values).
      const keys = await getSecret('admin-api-key').then(
        (value) => (value ? 'ok' : 'missing'),
        (error: { code?: string; statusCode?: number; name?: string }) => String(error.code ?? error.statusCode ?? error.name ?? 'error'),
      );
      return json({ ok: true, products: products.length, keys, version: VERSION });
    } catch (error) {
      context.error('Health check failed', error);
      // Error code only (no message or data), to tell configuration problems from outages.
      const e = (error ?? {}) as { code?: string | number; name?: string };
      return json({ ok: false, version: VERSION, error: String(e.code ?? e.name ?? 'unknown') }, 503);
    }
  },
});

app.http('products', {
  methods: ['GET'],
  route: 'products',
  authLevel: 'anonymous',
  handler: route('storefront', async () => {
    const products = (await getProducts()).filter((p) => p.active).map(publicProduct);
    return json({ products });
  }),
});

app.http('product', {
  methods: ['GET'],
  route: 'products/{slug}',
  authLevel: 'anonymous',
  handler: route('storefront', async (request) => {
    const slug = request.params.slug;
    const product = (await getProducts()).find((p) => p.active && (p.slug === slug || p.id === slug));
    if (!product) throw new HttpError(404, 'Product not found.');
    return json({ product: publicProduct(product) });
  }),
});

app.http('categories', {
  methods: ['GET'],
  route: 'categories',
  authLevel: 'anonymous',
  handler: route('storefront', async () => json({ categories: (await getCategories()).filter((c) => c.active) })),
});

app.http('cities', {
  methods: ['GET'],
  route: 'cities',
  authLevel: 'anonymous',
  handler: route('storefront', async () => {
    const cities = (await getCities()).map(({ id, name, province }) => ({ id, name, province }));
    return json({ cities: cities.sort((a, b) => a.name.localeCompare(b.name)) });
  }),
});

app.http('checkoutQuote', {
  methods: ['POST'],
  route: 'checkout/quote',
  authLevel: 'anonymous',
  handler: route('storefront', async (request) => {
    const body = await parseBody(request, quoteSchema);
    const quote = await buildQuote(body.items, body.cityId, body.service, await quoteContext());
    return json(publicQuote(quote));
  }),
});

app.http('placeOrder', {
  methods: ['POST'],
  route: 'orders',
  authLevel: 'anonymous',
  extraOutputs: [bookingQueue],
  handler: route('storefront', async (request, context) => {
    const body = await parseBody(request, orderSchema);
    const ctx = await quoteContext();
    const quote = await buildQuote(body.items, body.customer.cityId, body.service, ctx);
    if (quote.totalPkr !== body.expectedTotalPkr) {
      throw new HttpError(409, 'Prices or delivery charges changed. Please review the new total.', publicQuote(quote));
    }

    const { city } = quote;
    const order = await createOrder(
      quote,
      { ...body.customer, cityName: city.name, province: city.province },
      body.notes,
      ctx.settings,
    );

    if (order.status === 'confirmed' && ctx.settings.courierMode === 'trax' && ctx.settings.autoBook) {
      context.extraOutputs.set(bookingQueue, { orderId: order.id });
    }
    context.log(`Order ${order.number} placed (${order.status}), total Rs. ${order.totalPkr}`);

    return json(
      {
        orderNumber: order.number,
        status: order.status,
        subtotalPkr: order.subtotalPkr,
        deliveryFeePkr: order.deliveryFeePkr,
        totalPkr: order.totalPkr,
        paymentMethod: order.paymentMethod,
      },
      201,
    );
  }),
});

app.http('trackOrder', {
  methods: ['GET'],
  route: 'track',
  authLevel: 'anonymous',
  handler: route('storefront', async (request) => {
    const number = (request.query.get('order') ?? '').trim().toUpperCase();
    const phone = pkMobile.safeParse(request.query.get('phone') ?? '');
    const order = number && phone.success ? await findOrderByNumber(number) : undefined;
    // Same answer for a wrong number or a wrong phone, so order numbers can't be probed.
    if (!order || !phone.success || order.customer.phone !== phone.data) {
      throw new HttpError(404, 'No order matches that order number and phone number.');
    }
    return json({
      orderNumber: order.number,
      status: order.status,
      placedAt: order.createdAt,
      totalPkr: order.totalPkr,
      items: order.items.map((i) => ({ name: i.name, qty: i.qty })),
      shipments: order.shipments.map((s) => ({
        status: s.status,
        trackingNumber: s.trackingNumber,
        courier: s.courier === 'trax' ? 'Trax' : undefined,
        events: s.events.map(({ message, at }) => ({ message, at })),
      })),
    });
  }),
});
