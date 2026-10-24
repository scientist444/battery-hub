import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Product } from '@/types';
import type { DeliveryCopy } from '@/config/store';
import { ButtonLink } from '@/components/ui/Button';

/** Full-width storefront banner showcasing up to three products. */
export function HeroBanner({ spotlight, copy }: { spotlight: Product[]; copy: DeliveryCopy }) {
  const [main, ...side] = spotlight;

  return (
    <section className="bg-slate-950 text-white">
      <div className="container-custom grid items-center gap-10 py-12 lg:grid-cols-[1fr,1.1fr] lg:py-16">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">{copy.heroKicker}</p>
          <h1 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            Power for every project.
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-slate-300">
            Li-ion &amp; LiPo cells, SMPS power supplies, chargers, adapters and BMS boards. {copy.heroDelivery}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/products" size="lg" className="bg-white text-slate-950 hover:bg-slate-200">
              Shop all products
            </ButtonLink>
            <ButtonLink href="/products/batteries" size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:border-white">
              Shop batteries
            </ButtonLink>
          </div>
        </div>

        {main && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Link href={`/products/${main.slug}`} className="group relative row-span-2 aspect-[3/4] overflow-hidden rounded-xl bg-white">
              <Image src={main.image} alt={main.name} fill priority sizes="(min-width: 1024px) 28vw, 50vw" className="object-contain p-6 transition duration-500 group-hover:scale-105" />
              <HeroTag product={main} />
            </Link>
            {side.slice(0, 2).map((product) => (
              <Link key={product.id} href={`/products/${product.slug}`} className="group relative aspect-square overflow-hidden rounded-xl bg-white">
                <Image src={product.image} alt={product.name} fill sizes="(min-width: 1024px) 20vw, 50vw" className="object-contain p-5 transition duration-500 group-hover:scale-105" />
                <HeroTag product={product} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function HeroTag({ product }: { product: Product }) {
  return (
    <span className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 rounded-md bg-slate-950/85 px-3 py-2 text-xs backdrop-blur">
      <span className="line-clamp-1 font-medium">{product.name}</span>
      <span className="flex shrink-0 items-center gap-1 font-bold text-emerald-400">
        {product.price}
        <ArrowRight className="h-3 w-3" />
      </span>
    </span>
  );
}
