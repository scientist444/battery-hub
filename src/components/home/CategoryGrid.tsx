import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/types';
import { STORE_CATEGORIES } from '@/config/store';

/** "Shop by category" tiles using a real product photo for each collection. */
export function CategoryGrid({ products }: { products: Product[] }) {
  const tiles = STORE_CATEGORIES.map((category) => {
    const items = products.filter((p) => p.category === category.id);
    const cover = items.find((p) => !p.image.includes('placeholder')) ?? items[0];
    return { ...category, count: items.length, cover };
  }).filter((tile) => tile.count > 0);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
      {tiles.map((tile) => (
        <Link key={tile.id} href={tile.href} className="group overflow-hidden rounded-lg bg-slate-50 ring-1 ring-slate-200 transition hover:ring-slate-950">
          <div className="relative aspect-[4/3] bg-white">
            {tile.cover && (
              <Image src={tile.cover.image} alt={tile.label} fill sizes="(min-width: 1024px) 18vw, 45vw" className="object-contain p-4 transition duration-500 group-hover:scale-105" />
            )}
          </div>
          <div className="flex items-center justify-between px-3 py-3">
            <span className="text-sm font-semibold text-slate-950">{tile.label}</span>
            <span className="text-xs text-slate-500">{tile.count} items</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
