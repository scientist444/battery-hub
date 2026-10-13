import type { Metadata } from 'next';
import CollectionPage from '@/components/products/CollectionPage';

export const metadata: Metadata = {
  title: 'All Products',
  description: 'Browse Battery HUB batteries, chargers, power supplies, adapters and BMS boards.',
};

export default function ProductsPage({ searchParams }: { searchParams?: { q?: string } }) {
  return <CollectionPage query={searchParams?.q} />;
}
