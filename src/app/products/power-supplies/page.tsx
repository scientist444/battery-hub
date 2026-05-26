import type { Metadata } from 'next';
import ProductListing from '@/components/products/ProductListing';

export const metadata: Metadata = {
  title: 'Power Supplies',
};

export default function PowerSuppliesPage({ searchParams }: { searchParams?: { q?: string } }) {
  return (
    <ProductListing
      category="power-supplies"
      title="Power Supplies"
      description="Stable DC power supplies for electronics, testing, and projects."
      initialQuery={searchParams?.q || ''}
    />
  );
}
