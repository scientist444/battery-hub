import Link from 'next/link';
import { STORE_CATEGORIES } from '@/config/store';
import { products } from '@/data/products';

export default function ProductFilters({ activeCategory }: { activeCategory?: string }) {
  const availableCategories = STORE_CATEGORIES.filter((category) =>
    products.some((product) => product.category === category.id),
  );

  return (
    <div className="space-y-2">
      <Link
        href="/products"
        className={`block rounded-lg px-3 py-2 text-sm font-bold transition ${
          !activeCategory ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
        }`}
      >
        All Products
      </Link>
      {availableCategories.map((category) => (
        <Link
          key={category.id}
          href={category.href}
          className={`block rounded-lg px-3 py-2 text-sm font-bold transition ${
            activeCategory === category.id ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          {category.label}
        </Link>
      ))}
    </div>
  );
}
