import type { Metadata } from 'next';
import { getCatalog } from '@/lib/catalog';
import { isInStock } from '@/lib/stock';
import { SITE_URL, STORE_CATEGORIES, WHATSAPP_NUMBER, deliveryCopy } from '@/config/store';
import { isCheckoutEnabled } from '@/lib/backend';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ProductGrid, ProductRail } from '@/components/shop/ProductGrid';
import { HeroBanner } from '@/components/home/HeroBanner';
import { ValueProps } from '@/components/home/ValueProps';
import { CategoryGrid } from '@/components/home/CategoryGrid';
import { PromoBanners } from '@/components/home/PromoBanners';
import { CustomerReviews } from '@/components/reviews/CustomerReviews';
import { getReviewsOverview } from '@/lib/reviews';
import { apiProductId } from '@/lib/backend';

export function generateMetadata(): Metadata {
  return {
    title: 'Battery HUB - Batteries, Chargers, Power Supplies & Adapters',
    description: `Shop batteries, chargers, adapters, power supplies and BMS boards online. ${deliveryCopy(isCheckoutEnabled()).collectionNote}`,
  };
}

const HERO_SLUGS = ['bt-li-bhw-2600', '12v-400w-power-supply', 'chg-tp4056-hw107'];
const RAIL_CATEGORIES = ['batteries', 'power-supplies'] as const;

export default async function HomePage() {
  const [catalog, reviews] = await Promise.all([getCatalog(), getReviewsOverview()]);
  const productHref = (id: string) => {
    const product = catalog.find((p) => apiProductId(p.id) === id);
    return product ? `/products/${product.slug}#reviews` : undefined;
  };
  const available = catalog.filter(isInStock);

  const spotlight = HERO_SLUGS.map((slug) => catalog.find((p) => p.slug === slug)).filter(
    (p): p is NonNullable<typeof p> => Boolean(p),
  );
  const copy = deliveryCopy(isCheckoutEnabled());
  const bestSellers = available.filter((p) => p.featured).slice(0, 8);

  // Business details for search engines (name, logo, contact, rating).
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    name: 'Battery HUB',
    url: SITE_URL,
    logo: `${SITE_URL}/BH%20LOGO.png`,
    contactPoint: { '@type': 'ContactPoint', telephone: `+${WHATSAPP_NUMBER}`, contactType: 'customer service', areaServed: 'PK' },
    ...(reviews.overall.count > 0 && {
      aggregateRating: { '@type': 'AggregateRating', ratingValue: reviews.overall.average, reviewCount: reviews.overall.count },
    }),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization).replace(/</g, '\\u003c') }} />
      <HeroBanner spotlight={spotlight.length ? spotlight : available.slice(0, 3)} copy={copy} />
      <ValueProps copy={copy} />

      <section className="container-custom py-12 lg:py-16">
        <SectionHeading title="Shop by category" href="/products" linkLabel="All products" />
        <CategoryGrid products={catalog} />
      </section>

      {bestSellers.length > 0 && (
        <section className="container-custom pb-12 lg:pb-16">
          <SectionHeading title="Best sellers" subtitle="Most ordered by makers and students" href="/products" />
          <ProductGrid products={bestSellers} />
        </section>
      )}

      <CustomerReviews overview={reviews} productHref={productHref} />

      <section className="container-custom pb-12 lg:pb-16">
        <PromoBanners />
      </section>

      {RAIL_CATEGORIES.map((id) => {
        const category = STORE_CATEGORIES.find((c) => c.id === id)!;
        const items = available.filter((p) => p.category === id).slice(0, 8);
        if (items.length === 0) return null;
        return (
          <section key={id} className="container-custom pb-12 lg:pb-16">
            <SectionHeading title={category.label} subtitle={category.description} href={category.href} />
            <ProductRail products={items} />
          </section>
        );
      })}
    </>
  );
}
