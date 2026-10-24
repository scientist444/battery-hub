import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import WhatsAppButton from '@/components/ui/WhatsAppButton';
import { CartProvider } from '@/context/CartContext';
import { getCatalog } from '@/lib/catalog';
import { isCheckoutEnabled } from '@/lib/backend';
import { deliveryCopy } from '@/config/store';

/** Customer-facing storefront shell. The admin panel lives outside this group. */
export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const catalog = (await getCatalog()).map(({ id, price, stockStatus, stockQty }) => ({
    id,
    price,
    stockStatus,
    stockQty,
  }));

  const copy = deliveryCopy(isCheckoutEnabled());

  return (
    <CartProvider catalog={catalog}>
      <Navbar topBar={copy.topBar} />
      <main>{children}</main>
      <Footer copy={copy} />
      <WhatsAppButton />
    </CartProvider>
  );
}
