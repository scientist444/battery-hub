import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin, ShieldAlert, Truck, Wallet } from 'lucide-react';
import { categoryLabels } from '@/data/products';
import { getStoreCategory } from '@/config/store';
import { getCatalog, getProduct } from '@/lib/catalog';
import { StockBadge } from '@/components/ui/StockBadge';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ProductGallery } from '@/components/shop/ProductGallery';
import { ProductPurchase } from '@/components/shop/ProductPurchase';
import { ProductRail } from '@/components/shop/ProductGrid';

function splitSpec(spec: string) {
  const colonIdx = spec.indexOf(':');
  if (colonIdx === -1) return { label: 'Spec', value: spec };
  return { label: spec.slice(0, colonIdx).trim(), value: spec.slice(colonIdx + 1).trim() };
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const product = await getProduct(params.id);
  if (!product) return {};
  return { title: product.name, description: product.description.slice(0, 160) };
}

const perks = [
  { icon: Truck, text: 'Bykea delivery across Islamabad & Rawalpindi' },
  { icon: Wallet, text: 'Pay via SadaPay, confirm on WhatsApp' },
  { icon: MapPin, text: 'Local support for wiring & compatibility' },
];

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id);
  if (!product) notFound();

  const category = getStoreCategory(product.category);
  const related = (await getCatalog())
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  return (
    <div className="bg-white">
      <div className="container-custom py-6 lg:py-10">
        <nav className="mb-6 text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-950">Home</Link>
          <span className="mx-2">/</span>
          {category && (
            <>
              <Link href={category.href} className="hover:text-slate-950">{category.label}</Link>
              <span className="mx-2">/</span>
            </>
          )}
          <span className="text-slate-950">{product.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
          <ProductGallery images={product.images.length ? product.images : [product.image]} name={product.name} />

          <div className="lg:py-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{categoryLabels[product.category]}</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{product.name}</h1>
            <p className="mt-1 text-xs text-slate-400">SKU: {product.id}</p>

            <div className="mt-5 flex items-center gap-3">
              <p className="text-2xl font-bold text-slate-950">{product.price}</p>
              <StockBadge product={product} />
            </div>
            <p className="mt-1 text-xs text-slate-500">Delivery charges calculated on WhatsApp.</p>

            <div className="mt-6 border-t border-slate-200 pt-6">
              <ProductPurchase product={product} />
            </div>

            <ul className="mt-6 space-y-3 rounded-lg bg-slate-50 p-4">
              {perks.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-slate-700">
                  <Icon className="h-4 w-4 shrink-0 text-slate-950" />
                  {text}
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-950">Description</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{product.description}</p>
            </div>

            <div className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-950">Specifications</h2>
              <dl className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
                {product.specs.map((spec) => {
                  const { label, value } = splitSpec(spec);
                  return (
                    <div key={spec} className="grid grid-cols-[120px,1fr] gap-4 py-3 text-sm">
                      <dt className="font-medium text-slate-500">{label}</dt>
                      <dd className="text-slate-900">{value}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>

            <div className="mt-8 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <ShieldAlert className="h-5 w-5 shrink-0 text-amber-700" />
              <p className="text-sm leading-6 text-amber-900">{product.safetyNote}</p>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-16 border-t border-slate-200 pt-12">
            <SectionHeading title="You may also like" href={category?.href} />
            <ProductRail products={related} />
          </section>
        )}
      </div>
    </div>
  );
}
