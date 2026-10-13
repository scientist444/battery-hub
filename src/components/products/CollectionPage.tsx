import { getCatalog } from '@/lib/catalog';
import { getStoreCategory } from '@/config/store';
import { ProductCategory } from '@/types';
import ProductListing from '@/components/products/ProductListing';

interface CollectionPageProps {
  category?: ProductCategory;
  query?: string;
}

/** Server wrapper that loads the live catalog for a collection listing. */
export default async function CollectionPage({ category, query = '' }: CollectionPageProps) {
  const products = await getCatalog();
  const info = category ? getStoreCategory(category) : undefined;

  return (
    <ProductListing
      key={query}
      products={products}
      category={category}
      title={info?.label ?? 'All products'}
      description={
        info?.description ??
        'Batteries, chargers, power supplies, adapters and BMS boards. Delivered across Islamabad & Rawalpindi.'
      }
      initialQuery={query}
    />
  );
}
