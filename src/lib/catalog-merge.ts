import { Product, ProductOverride } from '@/types';
import { formatRupees } from '@/lib/format';
import { stockStatusFromQty } from '@/lib/stock';

// Client-safe: used by the storefront catalog on the server and by the admin preview in the browser.
export function applyOverride(product: Product, override?: ProductOverride): Product {
  if (!override) return product;
  const next = { ...product };
  if (typeof override.price === 'number') next.price = formatRupees(override.price);
  if (typeof override.stock === 'number') {
    next.stockQty = override.stock;
    next.stockStatus = stockStatusFromQty(override.stock);
  }
  return next;
}
