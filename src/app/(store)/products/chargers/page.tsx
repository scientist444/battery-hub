import type { Metadata } from 'next';
import CollectionPage from '@/components/products/CollectionPage';
import { getStoreCategory } from '@/config/store';

export const metadata: Metadata = {
  title: 'Chargers',
  description: getStoreCategory('chargers')?.description,
};

export default function ChargersPage({ searchParams }: { searchParams?: { q?: string } }) {
  return <CollectionPage category="chargers" query={searchParams?.q} />;
}
