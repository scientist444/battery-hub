import type { Metadata } from 'next';
import CollectionPage from '@/components/products/CollectionPage';
import { getStoreCategory } from '@/config/store';

export const metadata: Metadata = {
  title: 'Adapters',
  description: getStoreCategory('adapters')?.description,
};

export default function AdaptersPage({ searchParams }: { searchParams?: { q?: string } }) {
  return <CollectionPage category="adapters" query={searchParams?.q} />;
}
