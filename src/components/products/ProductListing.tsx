'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { categoryLabels } from '@/data/products';
import { Product, ProductCategory } from '@/types';
import { parsePrice } from '@/lib/format';
import { isInStock } from '@/lib/stock';
import { ProductGrid } from '@/components/shop/ProductGrid';
import ProductFilters from '@/components/shop/ProductFilters';

const sortOptions = {
  featured: 'Featured',
  'price-asc': 'Price, low to high',
  'price-desc': 'Price, high to low',
  'name-asc': 'Alphabetically, A-Z',
} as const;

type SortKey = keyof typeof sortOptions;

interface ProductListingProps {
  products: Product[];
  category?: ProductCategory;
  title?: string;
  description?: string;
  initialQuery?: string;
}

export default function ProductListing({
  products,
  category,
  title = 'All products',
  description,
  initialQuery = '',
}: ProductListingProps) {
  const [query, setQuery] = useState(initialQuery);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>('featured');

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const result = products.filter((product) => {
      if (category && product.category !== category) return false;
      if (inStockOnly && !isInStock(product)) return false;
      if (!normalizedQuery) return true;
      return [product.id, product.name, product.description, categoryLabels[product.category], ...product.specs]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });

    if (sort === 'price-asc') result.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    if (sort === 'price-desc') result.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
    if (sort === 'name-asc') result.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'featured') result.sort((a, b) => Number(isInStock(b)) - Number(isInStock(a)));
    return result;
  }, [products, category, query, inStockOnly, sort]);

  return (
    <div className="bg-white">
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="container-custom py-8 lg:py-10">
          <nav className="text-xs text-slate-500">
            <Link href="/" className="hover:text-slate-950">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-slate-950">{title}</span>
          </nav>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 lg:text-4xl">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>}
        </div>
      </section>

      <section className="container-custom py-8">
        <div className="grid gap-8 lg:grid-cols-[220px,1fr]">
          <aside className="space-y-6 lg:sticky lg:top-40 lg:self-start">
            <div>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Collections</h2>
              <ProductFilters activeCategory={category} />
            </div>
            <div>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Availability</h2>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(event) => setInStockOnly(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-slate-950"
                />
                In stock only
              </label>
            </div>
          </aside>

          <div>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search in this collection"
                  className="h-10 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-slate-950"
                />
              </div>
              <div className="flex items-center justify-between gap-4 sm:justify-end">
                <p className="text-sm text-slate-500">{filteredProducts.length} products</p>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="hidden sm:inline">Sort by</span>
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value as SortKey)}
                    className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-950"
                  >
                    {Object.entries(sortOptions).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {filteredProducts.length > 0 ? (
              <ProductGrid products={filteredProducts} className="lg:grid-cols-3 xl:grid-cols-4" />
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center">
                <h2 className="text-lg font-semibold text-slate-950">No products found</h2>
                <p className="mt-1 text-sm text-slate-500">Try a different search or remove filters.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
