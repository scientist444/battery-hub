'use client';

import { useState } from 'react';
import { Check, ShoppingBag } from 'lucide-react';
import { Product } from '@/types';
import { useCart } from '@/context/CartContext';
import { isInStock, maxOrderQty } from '@/lib/stock';
import { Button, type ButtonSize } from '@/components/ui/Button';

interface AddToCartButtonProps {
  product: Product;
  quantity?: number;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}

export function AddToCartButton({ product, quantity = 1, size = 'md', fullWidth = true, className }: AddToCartButtonProps) {
  const { addItem, getQuantity } = useCart();
  const [added, setAdded] = useState(false);
  const max = maxOrderQty(product);
  const reachedMax = max !== undefined && getQuantity(product.id) >= max;

  if (!isInStock(product)) {
    return (
      <Button variant="outline" size={size} fullWidth={fullWidth} className={className} disabled>
        Sold out
      </Button>
    );
  }

  const handleClick = () => {
    addItem(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <Button variant="primary" size={size} fullWidth={fullWidth} className={className} onClick={handleClick} disabled={reachedMax}>
      {added ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
      {reachedMax ? 'Max in cart' : added ? 'Added' : 'Add to cart'}
    </Button>
  );
}
