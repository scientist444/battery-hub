import { randomUUID } from 'crypto';
import { app } from '@azure/functions';
import { container, queryAll, readDoc } from '../lib/cosmos';
import { HttpError, json, parseBody, route } from '../lib/http';
import { QuoteRequest, StockAlert } from '../lib/types';
import { quoteRequestSchema, requestStatusSchema, stockAlertSchema } from '../lib/validation';

// Customer requests kept in the customers container under their own partition values,
// so they never mix with customer records (which are keyed by phone number).
const alertPartition = (productId: string) => `alert:${productId}`;

app.http('stockAlert', {
  methods: ['POST'],
  route: 'stock-alerts',
  authLevel: 'anonymous',
  handler: route('storefront', async (request) => {
    const body = await parseBody(request, stockAlertSchema);
    // One request per phone per product; asking again just refreshes it.
    const id = `alert_${body.productId}_${body.phone}`.slice(0, 250);
    const existing = await readDoc<StockAlert>('customers', id, alertPartition(body.productId));
    const now = new Date().toISOString();
    const alert: StockAlert = {
      id,
      phone: alertPartition(body.productId),
      type: 'stock-alert',
      productId: body.productId,
      productName: body.productName,
      name: body.name || undefined,
      contactPhone: body.phone,
      status: 'waiting',
      createdAt: existing?.doc.createdAt ?? now,
      updatedAt: now,
    };
    await container('customers').items.upsert(alert);
    return json({ ok: true });
  }),
});

app.http('quoteRequest', {
  methods: ['POST'],
  route: 'quote-requests',
  authLevel: 'anonymous',
  handler: route('storefront', async (request) => {
    const body = await parseBody(request, quoteRequestSchema);
    const now = new Date().toISOString();
    const quote: QuoteRequest = {
      id: `quote_${randomUUID()}`,
      phone: 'quote',
      type: 'quote',
      name: body.name,
      contactPhone: body.phone,
      organization: body.organization || undefined,
      city: body.city,
      details: body.details,
      status: 'new',
      createdAt: now,
      updatedAt: now,
    };
    await container('customers').items.upsert(quote);
    return json({ ok: true }, 201);
  }),
});

app.http('adminRequests', {
  methods: ['GET'],
  route: 'manage/requests',
  authLevel: 'anonymous',
  handler: route('admin', async () => {
    const [alerts, quotes] = await Promise.all([
      queryAll<StockAlert>('customers', "SELECT * FROM c WHERE c.type = 'stock-alert' AND c.status = 'waiting' ORDER BY c.createdAt DESC"),
      queryAll<QuoteRequest>('customers', "SELECT TOP 100 * FROM c WHERE c.phone = 'quote' AND c.type = 'quote' ORDER BY c.createdAt DESC"),
    ]);
    return json({ alerts, quotes });
  }),
});

app.http('adminRequestStatus', {
  methods: ['POST'],
  route: 'manage/requests/{id}/status',
  authLevel: 'anonymous',
  handler: route('admin', async (request) => {
    const body = await parseBody(request, requestStatusSchema);
    const partition = body.kind === 'alert' ? alertPartition(body.productId) : 'quote';
    const found = await readDoc<StockAlert | QuoteRequest>('customers', request.params.id, partition);
    if (!found) throw new HttpError(404, 'Request not found.');
    await container('customers').items.upsert({ ...found.doc, status: body.status, updatedAt: new Date().toISOString() });
    return json({ ok: true });
  }),
});
