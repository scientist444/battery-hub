import type { Metadata } from 'next';
import ProductListing from '@/components/products/ProductListing';

export const metadata: Metadata = {
  title: 'Products',
  description: 'Browse Battery HUB batteries, chargers, power supplies, and adapters.',
};

export default function ProductsPage({ searchParams }: { searchParams?: { q?: string } }) {
  return <ProductListing title="Products" initialQuery={searchParams?.q || ''} />;
}
