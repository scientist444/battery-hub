import type { Metadata } from 'next';
import CollectionPage from '@/components/products/CollectionPage';
import { getStoreCategory } from '@/config/store';

export const metadata: Metadata = {
  title: 'Batteries',
  description: getStoreCategory('batteries')?.description,
};

export default function BatteriesPage({ searchParams }: { searchParams?: { q?: string } }) {
  return <CollectionPage category="batteries" query={searchParams?.q} />;
}
