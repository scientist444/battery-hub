'use client';

import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Product } from '@/types';
import { createWhatsAppLink } from '@/config/store';
import { isInStock, maxOrderQty } from '@/lib/stock';
import { QuantitySelector } from '@/components/ui/QuantitySelector';
import { ExternalButtonLink } from '@/components/ui/Button';
import { AddToCartButton } from '@/components/shop/AddToCartButton';
import { NotifyMe } from '@/components/shop/NotifyMe';

export function ProductPurchase({ product, notifyEnabled = false }: { product: Product; notifyEnabled?: boolean }) {
  const [quantity, setQuantity] = useState(1);
  const inStock = isInStock(product);

  return (
    <div className="space-y-3">
      {inStock && (
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Quantity</p>
          <QuantitySelector value={quantity} onChange={setQuantity} max={maxOrderQty(product)} />
        </div>
      )}
      <AddToCartButton product={product} quantity={quantity} size="lg" />
      {!inStock && notifyEnabled && <NotifyMe productId={product.id} productName={product.name} />}
      <ExternalButtonLink href={createWhatsAppLink(product.whatsappText)} variant="whatsapp" size="lg" fullWidth>
        <MessageCircle className="h-4 w-4" />
        {inStock ? 'Order on WhatsApp' : 'Ask when back in stock'}
      </ExternalButtonLink>
    </div>
  );
}
