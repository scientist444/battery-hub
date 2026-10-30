import { createHash } from 'crypto';
import webpush from 'web-push';
import { container, queryAll } from './cosmos';
import { getSecret } from './secrets';
import { Order, PaymentMethod } from './types';

/**
 * Phone notifications for the admin app (Web Push). The VAPID key pair lives in Key Vault as
 * `vapid-public-key` and `vapid-private-key`; each admin phone's subscription is a document in
 * the settings container (partition key /id), so no new container is needed.
 */
export interface PushSubscriptionDoc {
  id: string;
  type: 'pushSubscription';
  endpoint: string;
  keys: { p256dh: string; auth: string };
  label: string;
  createdAt: string;
  lastSentAt?: string;
}

export interface PushMessage {
  title: string;
  body: string;
  /** Admin page opened when the notification is tapped. */
  url: string;
  /** Notifications with the same tag replace each other. */
  tag?: string;
}

export async function getVapidKeys() {
  const [publicKey, privateKey] = await Promise.all([getSecret('vapid-public-key'), getSecret('vapid-private-key')]);
  return publicKey && privateKey ? { publicKey, privateKey } : undefined;
}

export function subscriptionId(endpoint: string) {
  return `push-${createHash('sha256').update(endpoint).digest('hex').slice(0, 32)}`;
}

export function listSubscriptions() {
  return queryAll<PushSubscriptionDoc>('settings', "SELECT * FROM c WHERE c.type = 'pushSubscription'");
}

export async function saveSubscription(sub: { endpoint: string; keys: { p256dh: string; auth: string } }, label: string) {
  const doc: PushSubscriptionDoc = {
    id: subscriptionId(sub.endpoint),
    type: 'pushSubscription',
    endpoint: sub.endpoint,
    keys: sub.keys,
    label,
    createdAt: new Date().toISOString(),
  };
  await container('settings').items.upsert(doc);
  return doc;
}

export async function removeSubscription(endpoint: string) {
  const id = subscriptionId(endpoint);
  try {
    await container('settings').item(id, id).delete();
  } catch (error) {
    if ((error as { code?: number }).code !== 404) throw error;
  }
}

/**
 * Send a notification to every subscribed admin phone. Never throws: an order must not fail
 * because a notification could not be delivered. Phones that unsubscribed (404/410) are removed.
 */
export async function notifyAdmins(message: PushMessage, log: (msg: string) => void = () => {}) {
  try {
    const vapid = await getVapidKeys();
    if (!vapid) return { sent: 0, failed: 0, removed: 0, configured: false };
    const subs = await listSubscriptions();
    const payload = JSON.stringify(message);
    let sent = 0;
    let failed = 0;
    let removed = 0;

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload, {
            vapidDetails: { subject: 'https://batteryhub.com.pk', publicKey: vapid.publicKey, privateKey: vapid.privateKey },
            TTL: 24 * 60 * 60,
            urgency: 'high',
            timeout: 5000,
          });
          sent++;
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await removeSubscription(sub.endpoint).catch(() => undefined);
            removed++;
          } else {
            failed++;
            log(`Push to ${sub.label} failed: ${status ?? (error as Error).message}`);
          }
        }
      }),
    );
    return { sent, failed, removed, configured: true };
  } catch (error) {
    log(`Push notifications failed: ${(error as Error).message}`);
    return { sent: 0, failed: 0, removed: 0, configured: true };
  }
}

const PAYMENT_LABEL: Record<PaymentMethod, string> = { cod: 'COD', jazzcash: 'JazzCash', bank: 'Bank transfer', sadapay: 'SadaPay' };

export function newOrderMessage(order: Pick<Order, 'number' | 'status' | 'totalPkr' | 'paymentMethod' | 'customer' | 'items'>): PushMessage {
  const items = order.items.reduce((n, i) => n + i.qty, 0);
  const held = order.status === 'on_hold' ? ' (on hold, check it)' : '';
  return {
    title: `New order ${order.number}${held}`,
    body: `Rs. ${order.totalPkr.toLocaleString('en-PK')} · ${PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod} · ${items} item${items === 1 ? '' : 's'} · ${order.customer.name}, ${order.customer.cityName}`,
    url: '/admin/orders',
    tag: `order-${order.number}`,
  };
}
