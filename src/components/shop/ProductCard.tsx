'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { Product } from '@/types';
import { categoryLabels } from '@/data/products';
import { useCart } from '@/context/CartContext';

function SpecRow({ spec }: { spec: string }) {
  const colonIdx = spec.indexOf(':');
  if (colonIdx === -1) {
    return (
      <div className="rounded-md bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700">
        {spec}
      </div>
    );
  }
  const label = spec.slice(0, colonIdx).trim();
  const value = spec.slice(colonIdx + 1).trim();
  return (
    <div className="rounded-md bg-slate-50 px-2.5 py-1.5 text-xs leading-4">
      <span className="font-bold text-blue-700">{label}: </span>
      <span className="font-semibold text-slate-700">{value}</span>
    </div>
  );
}

export default function ProductCard({ product }: { product: Product }) {
  const { isInCart, getQuantity, addItem, updateQuantity } = useCart();
  const inCart = isInCart(product.id);
  const qty = getQuantity(product.id);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative h-52 w-full overflow-hidden bg-slate-50">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-contain p-4 transition duration-300 group-hover:scale-[1.04]"
          />
          <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200">
            {categoryLabels[product.category]}
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link href={`/products/${product.slug}`} className="block">
          <h3 className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-slate-900 transition group-hover:text-blue-700">
            {product.name}
          </h3>
        </Link>

        <div className="mt-3 space-y-1.5">
          {product.specs.slice(0, 3).map((spec) => (
            <SpecRow key={spec} spec={spec} />
          ))}
        </div>

        <div className="mt-auto pt-4">
          <div className="mb-3 border-t border-slate-100 pt-3">
            <p className="text-xl font-bold text-slate-950">{product.price}</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">
              Stock: <span className="text-slate-800">{product.stockStatus}</span>
            </p>
          </div>

          {inCart ? (
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                <button
                  type="button"
                  onClick={() => updateQuantity(product.id, qty - 1)}
                  className="flex h-6 w-6 items-center justify-center rounded text-slate-600 transition hover:bg-white hover:text-red-600"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="min-w-6 text-center text-sm font-bold text-slate-900">{qty}</span>
                <button
                  type="button"
                  onClick={() => updateQuantity(product.id, qty + 1)}
                  className="flex h-6 w-6 items-center justify-center rounded text-slate-600 transition hover:bg-white hover:text-blue-700"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <Link
                href="/cart"
                className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                Cart
              </Link>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => addItem(product)}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-blue-700 active:scale-[0.98]"
            >
              <ShoppingCart className="h-4 w-4" />
              Add to Cart
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
