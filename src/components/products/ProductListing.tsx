'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { categoryLabels, products } from '@/data/products';
import { Product, ProductCategory } from '@/types';
import ProductCard from '@/components/shop/ProductCard';
import ProductFilters from '@/components/shop/ProductFilters';

interface ProductListingProps {
  category?: ProductCategory;
  title?: string;
  description?: string;
  initialQuery?: string;
}

export default function ProductListing({ category, title = 'Products', description, initialQuery = '' }: ProductListingProps) {
  const [query, setQuery] = useState(initialQuery);
  const [stockFilter, setStockFilter] = useState('');

  const stockStatuses = useMemo(
    () => Array.from(new Set(products.map((product) => product.stockStatus).filter(Boolean))).sort(),
    [],
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = category ? product.category === category : true;
      const matchesStock = stockFilter ? product.stockStatus === stockFilter : true;
      const matchesQuery = normalizedQuery
        ? [
            product.id,
            product.name,
            product.description,
            product.category,
            categoryLabels[product.category],
            product.stockStatus,
            ...product.specs,
          ]
            .join(' ')
            .toLowerCase()
            .includes(normalizedQuery)
        : true;
      return matchesCategory && matchesStock && matchesQuery;
    });
  }, [category, query, stockFilter]);

  return (
    <div className="bg-slate-50">
      <section className="bg-white py-10 lg:py-14">
        <div className="container-custom">
          <p className="text-sm font-black uppercase tracking-wide text-emerald-700">Battery HUB</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">{title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
            {description ||
              'Browse Battery HUB products for WhatsApp ordering in Islamabad and Rawalpindi. Prices and availability are confirmed before order.'}
          </p>
        </div>
      </section>

      <section className="py-8 lg:py-10">
        <div className="container-custom">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid w-full gap-3 md:grid-cols-[1fr,220px] lg:max-w-3xl">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name, ID, voltage, current, category..."
                  className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>
              <select
                value={stockFilter}
                onChange={(event) => setStockFilter(event.target.value)}
                className="h-12 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                aria-label="Filter by stock status"
              >
                <option value="">All stock statuses</option>
                {stockStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-sm font-bold text-slate-500">{filteredProducts.length} products shown</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[220px,1fr]">
            <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-36 lg:self-start">
              <ProductFilters activeCategory={category} />
            </aside>

            <div>
              {filteredProducts.length > 0 ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredProducts.map((product: Product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-white p-10 text-center">
                  <h2 className="text-xl font-black text-slate-950">No products found</h2>
                  <p className="mt-2 text-sm text-slate-600">Try a different search term or category.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
