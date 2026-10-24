import { app, output } from '@azure/functions';
import { z } from 'zod';
import { bookOrder, refreshTracking } from '../lib/booking';
import { CITIES } from '../lib/cities';
import { getCategories, getProducts, getSuppliers, invalidateCatalog, saveProduct, saveSupplier } from '../lib/catalog';
import { getCities } from '../lib/context';
import { container, queryAll } from '../lib/cosmos';
import { HttpError, json, parseBody, route } from '../lib/http';
import { getOrder, restoreStock, saveOrder } from '../lib/orders';
import { getSettings, saveSettings } from '../lib/settings';
import { trax } from '../lib/shipping/courier-registry';
import { listTraxCities } from '../lib/shipping/trax';
import { Order, Product, StoreSettings, Supplier } from '../lib/types';
import { catalogSyncSchema, categorySchema, manualTrackingSchema, productSchema, statusChangeSchema, supplierSchema } from '../lib/validation';

const bookingQueue = output.storageQueue({ queueName: '%ORDERS_QUEUE%', connection: 'AzureWebJobsStorage' });

// ---------- Products ----------

app.http('adminProducts', {
  methods: ['GET', 'POST'],
  route: 'manage/products',
  authLevel: 'anonymous',
  handler: route('admin', async (request) => {
    if (request.method === 'GET') return json({ products: await getProducts() });
    const body = await parseBody(request, productSchema);
    const existing = (await getProducts()).find((p) => p.id === body.id);
    if (existing && existing.categoryId !== body.categoryId) {
      // Category is the partition key: moving a product means replacing the document.
      await container('products').item(existing.id, existing.categoryId).delete();
    }
    const product: Product = { ...body, updatedAt: new Date().toISOString() };
    await saveProduct(product);
    return json({ product }, existing ? 200 : 201);
  }),
});

app.http('adminProductStock', {
  methods: ['POST'],
  route: 'manage/products/{id}/stock',
  authLevel: 'anonymous',
  handler: route('admin', async (request) => {
    const { stock } = await parseBody(request, z.object({ stock: z.number().int().min(0).nullable() }));
    const product = (await getProducts()).find((p) => p.id === request.params.id);
    if (!product) throw new HttpError(404, 'Product not found.');
    await saveProduct({ ...product, stock });
    return json({ id: product.id, stock });
  }),
});

/**
 * The website admin is where prices, stock and product text are edited. It pushes its whole catalog here:
 * listed products are created or updated (keeping weight, box size, lithium flag and suppliers),
 * and products missing from the list are switched off.
 */
app.http('adminCatalogSync', {
  methods: ['POST'],
  route: 'manage/catalog/sync',
  authLevel: 'anonymous',
  handler: route('admin', async (request) => {
    const { products: incoming } = await parseBody(request, catalogSyncSchema);
    const existing = new Map((await getProducts()).map((p) => [p.id, p]));
    const now = new Date().toISOString();
    let created = 0;
    let updated = 0;
    let deactivated = 0;

    for (const fields of incoming) {
      const current = existing.get(fields.id);
      existing.delete(fields.id);
      const next: Product = current
        ? { ...current, ...fields, active: true, updatedAt: now }
        : { ...fields, containsLithium: fields.categoryId === 'batteries', suppliers: [], active: true, updatedAt: now };
      if (current && JSON.stringify({ ...current, updatedAt: now }) === JSON.stringify(next)) continue;
      if (current && current.categoryId !== next.categoryId) {
        await container('products').item(current.id, current.categoryId).delete();
      }
      await container('products').items.upsert(next);
      if (current) updated++;
      else created++;
    }
    for (const leftover of existing.values()) {
      if (!leftover.active) continue;
      await container('products').items.upsert({ ...leftover, active: false, updatedAt: now });
      deactivated++;
    }
    invalidateCatalog();
    return json({ created, updated, deactivated, unchanged: incoming.length - created - updated });
  }),
});

// ---------- Categories ----------

app.http('adminCategories', {
  methods: ['GET', 'POST'],
  route: 'manage/categories',
  authLevel: 'anonymous',
  handler: route('admin', async (request) => {
    if (request.method === 'GET') return json({ categories: await getCategories() });
    const category = await parseBody(request, categorySchema);
    await container('categories').items.upsert(category);
    return json({ category });
  }),
});

// ---------- Suppliers ----------

app.http('adminSuppliers', {
  methods: ['GET', 'POST'],
  route: 'manage/suppliers',
  authLevel: 'anonymous',
  handler: route('admin', async (request) => {
    if (request.method === 'GET') return json({ suppliers: await getSuppliers() });
    const body = await parseBody(request, supplierSchema);
    if (body.locations.filter((l) => l.isDefault).length !== 1) {
      throw new HttpError(400, 'Mark exactly one pickup location as the default.');
    }
    const supplier: Supplier = { ...body, updatedAt: new Date().toISOString() };
    await saveSupplier(supplier);
    // The first supplier becomes the default for products that have none assigned.
    const settings = await getSettings();
    if (!settings.defaultSupplierId) await saveSettings({ defaultSupplierId: supplier.id });
    return json({ supplier });
  }),
});

// ---------- Orders ----------

app.http('adminOrders', {
  methods: ['GET'],
  route: 'manage/orders',
  authLevel: 'anonymous',
  handler: route('admin', async (request) => {
    const status = request.query.get('status');
    const search = request.query.get('q')?.trim();
    const limit = Math.min(Number(request.query.get('limit')) || 50, 200);
    const filters: string[] = [];
    const params: { name: string; value: string | number }[] = [{ name: '@limit', value: limit }];
    if (status) {
      filters.push('c.status = @status');
      params.push({ name: '@status', value: status });
    }
    if (search) {
      filters.push('(c.number = @q OR c.customer.phone = @q OR CONTAINS(LOWER(c.customer.name), LOWER(@q)))');
      params.push({ name: '@q', value: search.toUpperCase().startsWith('BH-') ? search.toUpperCase() : search });
    }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const orders = await queryAll<Order>('orders', `SELECT TOP @limit * FROM c ${where} ORDER BY c.createdAt DESC`, params);
    return json({ orders });
  }),
});

app.http('adminOrder', {
  methods: ['GET'],
  route: 'manage/orders/{id}',
  authLevel: 'anonymous',
  handler: route('admin', async (request) => {
    const found = await getOrder(request.params.id);
    if (!found) throw new HttpError(404, 'Order not found.');
    return json({ order: found.doc });
  }),
});

app.http('adminOrderStatus', {
  methods: ['POST'],
  route: 'manage/orders/{id}/status',
  authLevel: 'anonymous',
  extraOutputs: [bookingQueue],
  handler: route('admin', async (request, context) => {
    const { status, note } = await parseBody(request, statusChangeSchema);
    const found = await getOrder(request.params.id);
    if (!found) throw new HttpError(404, 'Order not found.');
    const order = found.doc;
    const wasOpen = !['cancelled', 'returned'].includes(order.status);

    if (status === 'cancelled') {
      for (const shipment of order.shipments) {
        if (shipment.trackingNumber && shipment.courier === 'trax' && shipment.status === 'booked') {
          await trax.cancel(shipment.trackingNumber);
        }
        if (['picked_up', 'in_transit', 'out_for_delivery', 'delivered'].includes(shipment.status)) {
          throw new HttpError(409, 'A parcel has already been picked up. Mark it returned instead.');
        }
        shipment.status = 'cancelled';
      }
    } else {
      order.shipments.forEach((s) => {
        if (s.status !== 'cancelled' && (status !== 'confirmed' || ['on_hold', 'confirmed'].includes(s.status))) s.status = status;
      });
    }
    order.status = status;
    order.holdReason = status === 'on_hold' ? note ?? order.holdReason : undefined;
    order.history.push({ status, note, by: 'admin', at: new Date().toISOString() });
    const saved = await saveOrder(order, found.etag);

    if (wasOpen && (status === 'cancelled' || status === 'returned')) await restoreStock(saved);
    const settings = await getSettings();
    if (status === 'confirmed' && settings.courierMode === 'trax' && settings.autoBook) {
      context.extraOutputs.set(bookingQueue, { orderId: saved.id });
    }
    return json({ order: saved });
  }),
});

app.http('adminOrderBook', {
  methods: ['POST'],
  route: 'manage/orders/{id}/book',
  authLevel: 'anonymous',
  handler: route('admin', async (request) => {
    const settings = await getSettings();
    if (settings.courierMode !== 'trax') throw new HttpError(409, 'Trax is not switched on yet. Book in the Trax portal and add the tracking number.');
    try {
      return json({ order: await bookOrder(request.params.id, 'admin') });
    } catch (error) {
      throw new HttpError(502, `Trax booking failed: ${(error as Error).message}`);
    }
  }),
});

/** Before Trax is connected: record a tracking number from a manual booking in the Trax portal. */
app.http('adminOrderTracking', {
  methods: ['POST'],
  route: 'manage/orders/{id}/tracking',
  authLevel: 'anonymous',
  handler: route('admin', async (request) => {
    const { shipmentIndex, trackingNumber } = await parseBody(request, manualTrackingSchema);
    const found = await getOrder(request.params.id);
    if (!found) throw new HttpError(404, 'Order not found.');
    const order = found.doc;
    const shipment = order.shipments[shipmentIndex];
    if (!shipment) throw new HttpError(404, 'Shipment not found.');
    const now = new Date().toISOString();
    order.shipments[shipmentIndex] = {
      ...shipment,
      trackingNumber,
      status: 'booked',
      bookedAt: now,
      events: [...shipment.events, { status: 'booked', message: 'Booked with Trax', at: now }],
    };
    if (order.shipments.every((s) => s.trackingNumber || s.status === 'cancelled')) {
      order.status = 'booked';
      order.history.push({ status: 'booked', by: 'admin', at: now });
    }
    return json({ order: await saveOrder(order, found.etag) });
  }),
});

app.http('adminOrderRefresh', {
  methods: ['POST'],
  route: 'manage/orders/{id}/refresh',
  authLevel: 'anonymous',
  handler: route('admin', async (request) => {
    const found = await getOrder(request.params.id);
    if (!found) throw new HttpError(404, 'Order not found.');
    return json({ order: await refreshTracking(found.doc, found.etag) });
  }),
});

app.http('adminShipmentLabel', {
  methods: ['GET'],
  route: 'manage/orders/{id}/shipments/{index}/label',
  authLevel: 'anonymous',
  handler: route('admin', async (request) => {
    const found = await getOrder(request.params.id);
    const shipment = found?.doc.shipments[Number(request.params.index)];
    if (!shipment?.trackingNumber) throw new HttpError(404, 'This parcel has no tracking number yet.');
    const pdf = await trax.label(shipment.trackingNumber);
    return {
      status: 200,
      body: pdf,
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${shipment.trackingNumber}.pdf"` },
    };
  }),
});

// ---------- Settings and cities ----------

const settingsPatch = z
  .object({
    courierMode: z.enum(['flat', 'trax']),
    autoBook: z.boolean(),
    defaultSupplierId: z.string(),
    services: z.array(
      z.object({
        code: z.string(),
        name: z.string(),
        transport: z.enum(['road', 'air', 'unknown']),
        enabled: z.boolean(),
        speedRank: z.number().int(),
        maxWeightG: z.number().int().positive().optional(),
        courierId: z.number().int().optional(),
        etaDays: z.string().optional(),
      }),
    ),
    weightRules: z.array(z.object({ maxWeightG: z.number().int().positive(), preferredService: z.string() })),
    tieBreakPkr: z.number().int().min(0),
    groundOnly: z.boolean(),
    allowCustomerServiceChoice: z.boolean(),
    flatRates: z.object({ sameCity: z.number().int(), sameProvince: z.number().int(), otherProvince: z.number().int(), perExtraKg: z.number().int() }),
    packagingG: z.number().int().min(0),
    defaultWeightG: z.number().int().positive(),
    holdAbovePkr: z.number().int().positive(),
    maxCodPkr: z.number().int().positive(),
    rateCacheHours: z.number().min(0),
  })
  .partial();

app.http('adminSettings', {
  methods: ['GET', 'PATCH'],
  route: 'manage/settings',
  authLevel: 'anonymous',
  handler: route('admin', async (request) => {
    if (request.method === 'GET') return json({ settings: await getSettings() });
    const patch = (await parseBody(request, settingsPatch)) as Partial<StoreSettings>;
    return json({ settings: await saveSettings(patch) });
  }),
});

/** Match the built-in city list to Trax's cities by name and store the Trax IDs. */
app.http('adminSyncCities', {
  methods: ['POST'],
  route: 'manage/cities/sync',
  authLevel: 'anonymous',
  handler: route('admin', async () => {
    const traxCities = await listTraxCities();
    const byName = new Map(traxCities.map((c) => [c.name.trim().toLowerCase(), c.id]));
    const current = await getCities();
    const base = current.length ? current : CITIES;
    const cities = base.map((city) => ({ ...city, traxCityId: byName.get(city.name.toLowerCase().replace(/\s*\(.*\)$/, '')) ?? city.traxCityId }));
    await container('settings').items.upsert({ id: 'cities', cities });
    invalidateCatalog();
    const missing = cities.filter((c) => !c.traxCityId).map((c) => c.name);
    return json({ matched: cities.length - missing.length, missing, traxCityCount: traxCities.length });
  }),
});

// ---------- One-time import ----------

const importSchema = z.object({
  categories: z.array(categorySchema).default([]),
  suppliers: z.array(supplierSchema).default([]),
  products: z.array(productSchema).default([]),
});

/** Load categories, suppliers and products in bulk (upsert by ID). Used for the first import from the spreadsheet. */
app.http('adminImport', {
  methods: ['POST'],
  route: 'manage/import',
  authLevel: 'anonymous',
  handler: route('admin', async (request) => {
    const body = await parseBody(request, importSchema);
    const now = new Date().toISOString();
    for (const category of body.categories) await container('categories').items.upsert(category);
    for (const supplier of body.suppliers) await container('suppliers').items.upsert({ ...supplier, updatedAt: now });
    for (const product of body.products) await container('products').items.upsert({ ...product, updatedAt: now });
    invalidateCatalog();
    return json({ categories: body.categories.length, suppliers: body.suppliers.length, products: body.products.length });
  }),
});
