import Link from 'next/link';
import { STORE_CATEGORIES } from '@/config/store';
import { products } from '@/data/products';
import { cn } from '@/lib/cn';

const availableCategories = STORE_CATEGORIES.filter((category) =>
  products.some((product) => product.category === category.id),
);

export default function ProductFilters({ activeCategory }: { activeCategory?: string }) {
  const links = [{ id: undefined, label: 'All products', href: '/products' }, ...availableCategories];

  return (
    <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
      {links.map((link) => {
        const active = activeCategory === link.id;
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              className={cn(
                'block rounded-full border px-3 py-1.5 text-sm transition lg:rounded-md lg:border-0 lg:px-2',
                active
                  ? 'border-slate-950 bg-slate-950 text-white lg:bg-slate-100 lg:font-semibold lg:text-slate-950'
                  : 'border-slate-300 text-slate-600 hover:text-slate-950 lg:hover:bg-slate-50',
              )}
            >
              {link.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
