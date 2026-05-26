import type { Metadata } from 'next';
import ProductListing from '@/components/products/ProductListing';

export const metadata: Metadata = {
  title: 'BMS Boards',
};

export default function BmsBoardsPage({ searchParams }: { searchParams?: { q?: string } }) {
  return (
    <ProductListing
      category="bms-boards"
      title="BMS Boards"
      description="Protection boards for compatible lithium battery pack builds. Confirm cell count, chemistry, and current rating before use."
      initialQuery={searchParams?.q || ''}
    />
  );
}
