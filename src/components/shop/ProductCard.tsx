import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/types';
import { categoryLabels } from '@/data/products';
import { isInStock } from '@/lib/stock';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/Badge';
import { StockBadge } from '@/components/ui/StockBadge';
import { AddToCartButton } from '@/components/shop/AddToCartButton';
import { Stars } from '@/components/reviews/Stars';

function keySpec(product: Product) {
  const spec = product.specs.find((s) => /^(voltage|capacity)/i.test(s)) ?? product.specs[0];
  if (!spec) return null;
  return spec.includes(':') ? spec.slice(spec.indexOf(':') + 1).trim() : spec;
}

const imageSizes = '(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, 50vw';

export default function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const href = `/products/${product.slug}`;
  const hoverImage = product.images[1];
  const soldOut = !isInStock(product);
  const spec = keySpec(product);

  return (
    <article className="group flex h-full flex-col">
      <Link href={href} className="relative block aspect-square overflow-hidden rounded-lg bg-white ring-1 ring-slate-200">
        <Image
          src={product.image}
          alt={product.name}
          fill
          priority={priority}
          sizes={imageSizes}
          className={cn(
            'object-contain p-5 transition duration-500',
            hoverImage ? 'group-hover:opacity-0' : 'group-hover:scale-105',
            soldOut && 'opacity-60',
          )}
        />
        {hoverImage && (
          <Image
            src={hoverImage}
            alt=""
            fill
            sizes={imageSizes}
            className="object-contain p-5 opacity-0 transition duration-500 group-hover:opacity-100"
          />
        )}
        {soldOut && (
          <Badge tone="dark" className="absolute left-3 top-3">
            Sold out
          </Badge>
        )}
      </Link>

      <div className="flex flex-1 flex-col pt-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{categoryLabels[product.category]}</p>
        <Link href={href}>
          <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-slate-950 underline-offset-2 group-hover:underline">
            {product.name}
          </h3>
        </Link>
        {spec && <p className="mt-1 line-clamp-1 text-xs text-slate-500">{spec}</p>}
        {product.rating && (
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <Stars rating={product.rating.average} size="h-3.5 w-3.5" /> ({product.rating.count})
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="text-base font-bold text-slate-950">{product.price}</p>
          {!soldOut && <StockBadge product={product} />}
        </div>
        <div className="mt-auto pt-3">
          <AddToCartButton product={product} size="sm" />
        </div>
      </div>
    </article>
  );
}
