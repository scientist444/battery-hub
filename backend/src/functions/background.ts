import { app, InvocationContext, Timer } from '@azure/functions';
import { bookOrder, refreshTracking } from '../lib/booking';
import { queryAll } from '../lib/cosmos';
import { getSettings } from '../lib/settings';
import { Order } from '../lib/types';

// Confirmed orders waiting for a Trax booking. Retried by the queue on failure.
app.storageQueue('bookOrder', {
  queueName: '%ORDERS_QUEUE%',
  connection: 'AzureWebJobsStorage',
  handler: async (message: unknown, context: InvocationContext) => {
    const { orderId } = message as { orderId: string };
    const order = await bookOrder(orderId);
    context.log(`Order ${order.number}: ${order.shipments.map((s) => s.trackingNumber ?? 'not booked').join(', ')}`);
  },
});

// Every 45 minutes, update open Trax shipments. Trax does not push status changes.
app.timer('refreshTracking', {
  schedule: '0 */45 * * * *',
  handler: async (_timer: Timer, context: InvocationContext) => {
    const settings = await getSettings();
    if (settings.courierMode !== 'trax') return;
    const open = await queryAll<Order & { _etag: string }>(
      'orders',
      "SELECT * FROM c WHERE c.status IN ('booked', 'picked_up', 'in_transit', 'out_for_delivery', 'returning')",
    );
    for (const order of open) {
      try {
        await refreshTracking(order, order._etag);
      } catch (error) {
        context.warn(`Tracking refresh failed for ${order.number}`, error);
      }
    }
    context.log(`Tracking refreshed for ${open.length} order(s).`);
  },
});
