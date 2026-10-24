import { PAYMENT_OPTIONS, SITE_URL, type PaymentMethod } from '@/config/store';
import { formatRupees } from '@/lib/format';

/** Opens WhatsApp with a message to a Pakistani mobile number (03xx… → 923xx…). */
export function whatsAppTo(phone: string, message: string) {
  const digits = phone.replace(/\D/g, '').replace(/^0/, '92');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

interface MessageOrder {
  number: string;
  status: string;
  totalPkr: number;
  paymentMethod: string;
  paymentStatus: string;
  customer: { name: string; phone: string };
  shipments: { courier: string; trackingNumber?: string }[];
  invoiceUrl?: string;
}

export interface CustomerMessage {
  label: string;
  href: string;
}

/** Ready-to-send WhatsApp updates for an order, depending on where it is. */
export function orderMessages(order: MessageOrder): CustomerMessage[] {
  const first = order.customer.name.split(' ')[0];
  const hi = `Assalam o Alaikum ${first},`;
  const track = `${SITE_URL}/track?order=${encodeURIComponent(order.number)}`;
  const invoice = order.invoiceUrl ? `\nInvoice: ${SITE_URL}${order.invoiceUrl}` : '';
  const total = formatRupees(order.totalPkr);
  const rider = order.shipments.some((s) => s.courier === 'rider');
  const tracking = order.shipments.find((s) => s.trackingNumber)?.trackingNumber;
  const send = (label: string, text: string) => ({ label, href: whatsAppTo(order.customer.phone, text) });
  const messages: CustomerMessage[] = [];

  if (order.status === 'on_hold' && order.paymentMethod !== 'cod' && order.paymentStatus !== 'paid') {
    const account = PAYMENT_OPTIONS[order.paymentMethod as Exclude<PaymentMethod, 'cod'>]?.account;
    messages.push(
      send(
        'Payment reminder',
        `${hi} thank you for your Battery HUB order ${order.number}. Please send ${total}` +
          (account ? ` to ${account.bank} ${account.number} (${account.title})` : '') +
          ' and share the screenshot here. We dispatch as soon as it arrives.',
      ),
    );
  } else if (order.status === 'on_hold') {
    messages.push(send('Confirm order', `${hi} this is Battery HUB about your order ${order.number} (${total}). Please reply YES to confirm it and we will dispatch it.`));
  }
  if (['on_hold', 'confirmed'].includes(order.status)) {
    messages.push(
      send(
        'Order confirmed',
        `${hi} your Battery HUB order ${order.number} is confirmed. Total ${total}` +
          (order.paymentMethod === 'cod' ? ' (cash on delivery)' : '') +
          `. ${rider ? 'Please send your live location here and we will book a rider.' : 'We will share the tracking number once it is dispatched.'}${invoice}`,
      ),
    );
  }
  if (tracking || rider) {
    messages.push(
      send(
        'Dispatched',
        `${hi} your Battery HUB order ${order.number} is on its way` +
          (tracking ? ` with ${rider ? 'our rider' : 'Trax'}. Tracking number: ${tracking}.` : ' with our rider.') +
          `\nTrack it here: ${track}` +
          (order.paymentMethod === 'cod' && order.paymentStatus !== 'paid' ? `\nPlease keep ${total} cash ready.` : ''),
      ),
    );
  }
  if (order.status === 'delivered') {
    messages.push(
      send(
        'Thank you + review',
        `${hi} thank you for shopping with Battery HUB! We hope order ${order.number} is working well. ` +
          `If you have a minute, please review it here (sign in with Google): ${SITE_URL}/account`,
      ),
    );
  }
  return messages;
}
