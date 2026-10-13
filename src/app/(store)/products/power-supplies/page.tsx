import type { Metadata } from 'next';
import CollectionPage from '@/components/products/CollectionPage';
import { getStoreCategory } from '@/config/store';

export const metadata: Metadata = {
  title: 'Power Supplies',
  description: getStoreCategory('power-supplies')?.description,
};

export default function PowerSuppliesPage({ searchParams }: { searchParams?: { q?: string } }) {
  return <CollectionPage category="power-supplies" query={searchParams?.q} />;
}
