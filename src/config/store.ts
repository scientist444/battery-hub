export const WHATSAPP_NUMBER = '923203540318';
export const WHATSAPP_DISPLAY_NUMBER = '03203540318';
export const SERVICE_AREA = 'Islamabad & Rawalpindi';
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
