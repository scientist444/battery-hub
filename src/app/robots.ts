import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/config/store';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/account', '/checkout', '/cart', '/invoice', '/auth', '/api'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
