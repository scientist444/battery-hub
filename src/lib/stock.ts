import { Product } from '@/types';

export const LOW_STOCK_THRESHOLD = 5;

export function stockStatusFromQty(qty: number): string {
  if (qty <= 0) return 'Out of Stock';
  if (qty <= LOW_STOCK_THRESHOLD) return 'Low Stock';
  return 'In Stock';
}

export function isInStock(product: Pick<Product, 'stockStatus' | 'stockQty'>): boolean {
  if (typeof product.stockQty === 'number') return product.stockQty > 0;
  return !/out of stock|sold out/i.test(product.stockStatus);
}

/** Highest quantity a customer may add, or undefined when stock is not tracked. */
export function maxOrderQty(product: Pick<Product, 'stockQty'>): number | undefined {
  return typeof product.stockQty === 'number' ? Math.max(product.stockQty, 0) : undefined;
}
