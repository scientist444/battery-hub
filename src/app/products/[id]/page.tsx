'use client';

import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { categoryLabels, getProductBySlugOrId } from '@/data/products';
import { useCart } from '@/context/CartContext';

function splitSpec(spec: string) {
  const colonIdx = spec.indexOf(':');
  if (colonIdx === -1) return { label: 'Spec', value: spec };
  return { label: spec.slice(0, colonIdx).trim(), value: spec.slice(colonIdx + 1).trim() };
}

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const product = getProductBySlugOrId(params.id);
  if (!product) notFound();

  const { isInCart, getQuantity, addItem, updateQuantity } = useCart();
  const inCart = isInCart(product.id);
  const qty = getQuantity(product.id);

  return (
    <div className="bg-slate-50 py-10 lg:py-14">
      <div className="container-custom">
        <div className="mb-5 text-sm font-semibold text-slate-500">
          <Link href="/products" className="hover:text-blue-700">
            Products
          </Link>
          <span className="mx-2">/</span>
          <span>{product.name}</span>
        </div>

        <div className="grid gap-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[0.9fr,1.1fr] lg:p-8">
          <div className="relative h-80 rounded-xl bg-slate-50 sm:h-[28rem]">
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-contain p-6"
              priority
            />
          </div>

          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-blue-600">
              {categoryLabels[product.category]}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 lg:text-4xl">
              {product.name}
            </h1>
            <p className="mt-2 text-xs text-slate-400">ID: {product.id}</p>

            <p className="mt-4 text-2xl font-bold text-slate-950">{product.price}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                {product.stockStatus}
              </span>
              <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                Islamabad &amp; Rawalpindi
              </span>
            </div>

            <p className="mt-4 text-sm leading-7 text-slate-600">{product.description}</p>

            <div className="mt-6">
              {inCart ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => updateQuantity(product.id, qty - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded text-slate-600 transition hover:bg-white hover:text-red-600"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="min-w-8 text-center text-base font-bold text-slate-950">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(product.id, qty + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded text-slate-600 transition hover:bg-white hover:text-blue-700"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <Link
                    href="/cart"
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    View Cart
                  </Link>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => addItem(product)}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-700 active:scale-[0.98]"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Add to Cart
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr,0.8fr]">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">Specifications</h2>
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
              {product.specs.map((spec) => {
                const { label, value } = splitSpec(spec);
                return (
                  <div
                    key={spec}
                    className="grid grid-cols-[130px,1fr] border-b border-slate-200 last:border-0"
                  >
                    <div className="bg-slate-50 px-4 py-3 text-sm font-bold text-blue-700">
                      {label}
                    </div>
                    <div className="px-4 py-3 text-sm text-slate-800">{value}</div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">Ordering Note</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Add this product to your cart, then proceed to checkout to pay and confirm your order
              via WhatsApp. Delivery is via Bykea within Islamabad &amp; Rawalpindi.
            </p>

            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h3 className="text-sm font-bold text-amber-900">Safety note</h3>
              <p className="mt-2 text-sm leading-6 text-amber-900">{product.safetyNote}</p>
            </div>
          </section>
        </div>

        {product.images.length > 1 && (
          <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">More Photos</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {product.images.slice(1).map((image) => (
                <div key={image} className="relative h-44 rounded-xl bg-slate-50">
                  <Image
                    src={image}
                    alt={`${product.name} photo`}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                    className="object-contain p-4"
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
