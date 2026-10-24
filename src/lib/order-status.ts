const STATUS_LABELS: Record<string, string> = {
  on_hold: 'Waiting for confirmation',
  confirmed: 'Confirmed',
  booked: 'Booked with courier',
  picked_up: 'Picked up by courier',
  in_transit: 'On the way',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  returning: 'Being returned',
  returned: 'Returned',
  cancelled: 'Cancelled',
  partially_delivered: 'Partly delivered',
};


/** Order status in customer words; advance-payment orders on hold are waiting for the payment. */
export function customerStatusLabel(order: { status: string; paymentMethod: string; paymentStatus: string }) {
  if (order.paymentMethod !== 'cod' && order.paymentStatus !== 'paid' && order.status === 'on_hold') return 'Waiting for payment';
  return STATUS_LABELS[order.status] ?? order.status.replace(/_/g, ' ');
}
