import type { Metadata } from 'next';
import ProductListing from '@/components/products/ProductListing';

export const metadata: Metadata = {
  title: 'Chargers',
};

export default function ChargersPage({ searchParams }: { searchParams?: { q?: string } }) {
  return (
    <ProductListing
      category="chargers"
      title="Chargers"
      description="Compatible charging solutions for batteries and small devices."
      initialQuery={searchParams?.q || ''}
    />
  );
}
