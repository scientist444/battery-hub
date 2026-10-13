import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import WhatsAppButton from '@/components/ui/WhatsAppButton';
import { CartProvider } from '@/context/CartContext';
import { getCatalog } from '@/lib/catalog';

/** Customer-facing storefront shell. The admin panel lives outside this group. */
export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const catalog = (await getCatalog()).map(({ id, price, stockStatus, stockQty }) => ({
    id,
    price,
    stockStatus,
    stockQty,
  }));

  return (
    <CartProvider catalog={catalog}>
      <Navbar />
      <main>{children}</main>
      <Footer />
      <WhatsAppButton />
    </CartProvider>
  );
}
