import { app } from '@azure/functions';
import { z } from 'zod';
import { HttpError, json, parseBody, route } from '../lib/http';
import { getVapidKeys, listSubscriptions, notifyAdmins, removeSubscription, saveSubscription } from '../lib/push';

const subscriptionSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url().max(1000),
    keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
  }),
  label: z.string().trim().max(80).default('Phone'),
});

// Public VAPID key for the admin app, plus the phones that get notifications.
app.http('adminPush', {
  methods: ['GET'],
  route: 'manage/push',
  authLevel: 'anonymous',
  handler: route('admin', async () => {
    const vapid = await getVapidKeys();
    const devices = vapid ? await listSubscriptions() : [];
    return json({
      publicKey: vapid?.publicKey ?? null,
      devices: devices.map(({ id, label, createdAt, endpoint }) => ({ id, label, createdAt, endpoint })),
    });
  }),
});

app.http('adminPushSubscribe', {
  methods: ['POST'],
  route: 'manage/push/subscribe',
  authLevel: 'anonymous',
  handler: route('admin', async (request) => {
    if (!(await getVapidKeys())) throw new HttpError(503, 'Notifications are not set up yet (VAPID keys missing in Key Vault).');
    const { subscription, label } = await parseBody(request, subscriptionSchema);
    const doc = await saveSubscription(subscription, label);
    return json({ id: doc.id }, 201);
  }),
});

app.http('adminPushUnsubscribe', {
  methods: ['POST'],
  route: 'manage/push/unsubscribe',
  authLevel: 'anonymous',
  handler: route('admin', async (request) => {
    const { endpoint } = await parseBody(request, z.object({ endpoint: z.string().url().max(1000) }));
    await removeSubscription(endpoint);
    return json({ ok: true });
  }),
});

app.http('adminPushTest', {
  methods: ['POST'],
  route: 'manage/push/test',
  authLevel: 'anonymous',
  handler: route('admin', async (_request, context) => {
    const result = await notifyAdmins(
      { title: 'Battery HUB test', body: 'Notifications are working. New orders will show up like this.', url: '/admin/orders', tag: 'test' },
      (msg) => context.warn(msg),
    );
    if (!result.configured) throw new HttpError(503, 'Notifications are not set up yet (VAPID keys missing in Key Vault).');
    return json(result);
  }),
});
