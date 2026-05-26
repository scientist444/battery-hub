export const WHATSAPP_NUMBER = '923203540318';
export const WHATSAPP_DISPLAY_NUMBER = '03203540318';
export const SERVICE_AREA = 'Islamabad & Rawalpindi';
export const OWNERS = ['Muhammad Umer Sajid', 'Muhammad Owais Rafeeq'];

export const STORE_CATEGORIES = [
  { id: 'batteries', label: 'Batteries', href: '/products/batteries' },
  { id: 'chargers', label: 'Chargers', href: '/products/chargers' },
  { id: 'power-supplies', label: 'Power Supplies', href: '/products/power-supplies' },
  { id: 'adapters', label: 'Adapters', href: '/products/adapters' },
  { id: 'bms-boards', label: 'BMS Boards', href: '/products/bms-boards' },
] as const;

export function createWhatsAppLink(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function createProductOrderMessage(productName: string, productId?: string) {
  const idText = productId ? ` Product ID: ${productId}.` : '';
  return `Assalam o Alaikum, I want to order ${productName}.${idText} Please confirm price and availability.`;
}
