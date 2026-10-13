import { Product } from '@/types';
import { isInStock, LOW_STOCK_THRESHOLD } from '@/lib/stock';
import { Badge } from '@/components/ui/Badge';

export function StockBadge({ product, className }: { product: Pick<Product, 'stockStatus' | 'stockQty'>; className?: string }) {
  if (!isInStock(product)) {
    return <Badge tone="danger" className={className}>Sold out</Badge>;
  }
  if (typeof product.stockQty === 'number' && product.stockQty <= LOW_STOCK_THRESHOLD) {
    return <Badge tone="warning" className={className}>Only {product.stockQty} left</Badge>;
  }
  return <Badge tone="success" className={className}>In stock</Badge>;
}
