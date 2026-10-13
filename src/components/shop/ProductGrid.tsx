import { Product } from '@/types';
import ProductCard from '@/components/shop/ProductCard';
import { cn } from '@/lib/cn';

export function ProductGrid({ products, className }: { products: Product[]; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4', className)}>
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} priority={index < 4} />
      ))}
    </div>
  );
}

/** Horizontally scrolling row on mobile, grid on larger screens. */
export function ProductRail({ products }: { products: Product[] }) {
  return (
    <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-4">
      {products.map((product) => (
        <div key={product.id} className="w-[44vw] shrink-0 snap-start sm:w-auto">
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  );
}
