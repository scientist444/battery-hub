import type { Metadata } from 'next';
import ProductListing from '@/components/products/ProductListing';

export const metadata: Metadata = {
  title: 'Adapters',
};

export default function AdaptersPage({ searchParams }: { searchParams?: { q?: string } }) {
  return (
    <ProductListing
      category="adapters"
      title="Adapters"
      description="AC/DC adapters for routers, LEDs, modules, and low-power devices."
      initialQuery={searchParams?.q || ''}
    />
  );
}
