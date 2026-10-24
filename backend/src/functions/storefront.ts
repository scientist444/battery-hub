import { readFileSync } from 'fs';
import { join } from 'path';
import { app, output } from '@azure/functions';
import { getCategories, getProducts, publicProduct } from '../lib/catalog';
import { getCities, quoteContext } from '../lib/context';
import { getSecret } from '../lib/secrets';
import { HttpError, json, parseBody, route } from '../lib/http';
import { createOrder, findOrderByNumber } from '../lib/orders';
import { buildQuote, publicQuote } from '../lib/quote';
import { accountId, accountSchema, orderSchema, pkMobile, quoteSchema } from '../lib/validation';
import { container, queryAll, readDoc } from '../lib/cosmos';
import { Account, Order } from '../lib/types';

// Commit SHA written at deploy time, so a health check can tell which build is serving.
const VERSION = (() => {
  try {
    return (JSON.parse(readFileSync(join(__dirname, '..', '..', 'version.json'), 'utf8')) as { sha: string }).sha;
  } catch {
    return 'dev';
  }
})();

function customerView(order: Order) {
  return {
    orderNumber: order.number,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    placedAt: order.createdAt,
    totalPkr: order.totalPkr,
    items: order.items.map((i) => ({ productId: i.productId, name: i.name, qty: i.qty })),
    shipments: order.shipments.map((s) => ({
      status: s.status,
      trackingNumber: s.trackingNumber,
      courier: s.courier === 'trax' ? 'Trax' : s.courier === 'rider' ? 'Bykea / InDrive rider' : undefined,
      events: s.events.map(({ message, at }) => ({ message, at })),
    })),
  };
}

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
      body.paymentMethod,
      body.accountId,
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
    return json(customerView(order));
  }),
});

// ---------- Signed-in customers ----------
// The website signs customers in with Google and passes the verified account ID; these routes trust it
// because only the website's server holds the storefront key.

app.http('customerAccount', {
  methods: ['GET', 'PUT'],
  route: 'customer/account',
  authLevel: 'anonymous',
  handler: route('storefront', async (request) => {
    if (request.method === 'GET') {
      const id = accountId.parse(request.query.get('accountId'));
      // Account documents use their own ID as the partition key value.
      const found = await readDoc<Account>('customers', id, id);
      if (!found) throw new HttpError(404, 'No account yet.');
      return json({ account: found.doc });
    }
    const body = await parseBody(request, accountSchema);
    const existing = await readDoc<Account>('customers', body.accountId, body.accountId);
    const now = new Date().toISOString();
    const account: Account = {
      id: body.accountId,
      phone: body.accountId,
      type: 'account',
      email: body.email,
      name: body.name,
      mobile: body.mobile,
      address: body.address,
      createdAt: existing?.doc.createdAt ?? now,
      updatedAt: now,
    };
    await container('customers').items.upsert(account);
    return json({ account });
  }),
});

app.http('customerOrders', {
  methods: ['GET'],
  route: 'customer/orders',
  authLevel: 'anonymous',
  handler: route('storefront', async (request) => {
    const id = accountId.parse(request.query.get('accountId'));
    const orders = await queryAll<Order>('orders', 'SELECT TOP 50 * FROM c WHERE c.accountId = @a ORDER BY c.createdAt DESC', [
      { name: '@a', value: id },
    ]);
    return json({ orders: orders.map(customerView) });
  }),
});
