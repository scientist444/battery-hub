import type { Metadata } from 'next';
import ProductListing from '@/components/products/ProductListing';

export const metadata: Metadata = {
  title: 'Batteries',
};

export default function BatteriesPage({ searchParams }: { searchParams?: { q?: string } }) {
  return (
    <ProductListing
      category="batteries"
      title="Batteries"
      description="Rechargeable battery options for electronics and project use."
      initialQuery={searchParams?.q || ''}
    />
  );
}
