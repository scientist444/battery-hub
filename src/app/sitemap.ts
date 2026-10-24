import type { MetadataRoute } from 'next';
import { POLICIES } from '@/config/policies';
import { SITE_URL, STORE_CATEGORIES } from '@/config/store';
import { getCatalog } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

/** Every public page, so search engines find all products. Served at /sitemap.xml. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const page = (path: string, priority: number, changeFrequency: 'daily' | 'weekly' | 'monthly' = 'weekly') => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  });
  const catalog = await getCatalog();
  return [
    page('/', 1, 'daily'),
    page('/products', 0.9, 'daily'),
    ...STORE_CATEGORIES.map((c) => page(c.href, 0.8, 'daily')),
    ...catalog.map((p) => page(`/products/${p.slug}`, 0.7)),
    page('/calculator', 0.5, 'monthly'),
    page('/custom-battery', 0.5, 'monthly'),
    page('/bulk-order', 0.5, 'monthly'),
    page('/blog', 0.4),
    page('/about', 0.3, 'monthly'),
    page('/contact', 0.3, 'monthly'),
    page('/track', 0.3, 'monthly'),
    ...POLICIES.map((p) => page(`/policies/${p.slug}`, 0.2, 'monthly')),
  ];
}
