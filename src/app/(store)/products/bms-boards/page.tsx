import type { Metadata } from 'next';
import CollectionPage from '@/components/products/CollectionPage';
import { getStoreCategory } from '@/config/store';

export const metadata: Metadata = {
  title: 'BMS Boards',
  description: getStoreCategory('bms-boards')?.description,
};

export default function BmsBoardsPage({ searchParams }: { searchParams?: { q?: string } }) {
  return <CollectionPage category="bms-boards" query={searchParams?.q} />;
}
