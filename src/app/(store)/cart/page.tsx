import { CartView } from '@/components/shop/CartView';
import { isCheckoutEnabled } from '@/lib/backend';

export const dynamic = 'force-dynamic';

export default function CartPage() {
  return <CartView checkoutEnabled={isCheckoutEnabled()} />;
}
