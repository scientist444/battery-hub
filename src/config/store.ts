export const WHATSAPP_NUMBER = '923203540318';
export const WHATSAPP_DISPLAY_NUMBER = '03203540318';
export const SERVICE_AREA = 'Islamabad & Rawalpindi';

/**
 * Customer-facing delivery wording. `nationwide` is true once online checkout is connected
 * (BACKEND_* variables set in Vercel); until then the store keeps its local WhatsApp wording.
 */
export function deliveryCopy(nationwide: boolean) {
  return nationwide
    ? {
        serviceArea: 'All over Pakistan',
        trackOrders: true,
        topBar: 'Delivery all over Pakistan · Cash on delivery · Order online',
        delivery: 'Courier delivery all over Pakistan',
        deliveryShort: 'Nationwide delivery',
        deliveryDetail: 'Courier to your door, anywhere in Pakistan',
        payment: 'Cash on delivery',
        paymentPerk: 'Cash on delivery, no advance payment',
        orderMethod: 'Order online at checkout, or ask us on WhatsApp.',
        footerNote: 'Online ordering with cash on delivery across Pakistan.',
        heroKicker: 'Delivered all over Pakistan',
        collectionNote: 'Delivered all over Pakistan.',
        about: 'We deliver all over Pakistan by courier, with cash on delivery.',
        heroDelivery: 'Order online, pay cash on delivery.',
      }
    : {
        serviceArea: SERVICE_AREA,
        trackOrders: false,
        topBar: 'Serving Islamabad & Rawalpindi · Delivery via Bykea · Orders via WhatsApp',
        delivery: 'Bykea delivery across Islamabad & Rawalpindi',
        deliveryShort: 'Bykea delivery',
        deliveryDetail: 'Across Islamabad & Rawalpindi',
        payment: 'Pay via SadaPay',
        paymentPerk: 'Pay via SadaPay, confirm on WhatsApp',
        orderMethod: 'Orders confirmed through WhatsApp only.',
        footerNote: 'WhatsApp-only ordering for Islamabad & Rawalpindi.',
        heroKicker: 'Islamabad & Rawalpindi',
        collectionNote: 'Delivered across Islamabad & Rawalpindi.',
        about: 'We are currently operating only in Islamabad and Rawalpindi, with orders confirmed through WhatsApp.',
        heroDelivery: 'Order online, delivered by Bykea.',
      };
}

export type DeliveryCopy = ReturnType<typeof deliveryCopy>;
export const OWNER = 'Muhammad Umer Sajid';

export const STORE_CATEGORIES = [
  {
    id: 'batteries',
    label: 'Batteries',
    href: '/products/batteries',
    description: 'Rechargeable battery options for electronics and project use.',
  },
  {
    id: 'chargers',
    label: 'Chargers',
    href: '/products/chargers',
    description: 'Compatible charging solutions for batteries and small devices.',
  },
  {
    id: 'power-supplies',
    label: 'Power Supplies',
    href: '/products/power-supplies',
    description: 'Stable DC power supplies for electronics, testing, and projects.',
  },
  {
    id: 'adapters',
    label: 'Adapters',
    href: '/products/adapters',
    description: 'AC/DC adapters for routers, LEDs, modules, and low-power devices.',
  },
  {
    id: 'bms-boards',
    label: 'BMS Boards',
    href: '/products/bms-boards',
    description:
      'Protection boards for compatible lithium battery pack builds. Confirm cell count, chemistry, and current rating before use.',
  },
] as const;

export function getStoreCategory(id: string) {
  return STORE_CATEGORIES.find((category) => category.id === id);
}

export function createWhatsAppLink(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function createProductOrderMessage(productName: string, productId?: string) {
  const idText = productId ? ` Product ID: ${productId}.` : '';
  return `Assalam o Alaikum, I want to order ${productName}.${idText} Please confirm price and availability.`;
}
