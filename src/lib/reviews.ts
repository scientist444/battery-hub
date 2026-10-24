import { unstable_cache } from 'next/cache';
import { backendFetch, isCheckoutEnabled } from '@/lib/backend';

export interface PublicReview {
  id: string;
  productId: string;
  productName: string;
  name: string;
  rating: number;
  title?: string;
  body: string;
  createdAt: string;
}

export interface RatingSummary {
  average: number;
  count: number;
  /** Count of 1 to 5 star reviews, index 0 = 1 star. */
  stars: number[];
}

export interface ReviewsOverview {
  overall: RatingSummary;
  products: Record<string, { average: number; count: number }>;
  latest: PublicReview[];
}

export const REVIEWS_TAG = 'reviews';
const EMPTY: ReviewsOverview = { overall: { average: 0, count: 0, stars: [0, 0, 0, 0, 0] }, products: {}, latest: [] };

const loadOverview = unstable_cache(
  async (): Promise<ReviewsOverview> => {
    try {
      return await backendFetch<ReviewsOverview>('storefront', 'reviews/overview', { timeoutMs: 5000 });
    } catch (error) {
      console.error('Reviews overview unavailable', error);
      return EMPTY;
    }
  },
  ['reviews-overview'],
  { revalidate: 300, tags: [REVIEWS_TAG] },
);

/** Ratings for product cards and the latest reviews. Cached for five minutes; never throws. */
export function getReviewsOverview() {
  return isCheckoutEnabled() ? loadOverview() : Promise.resolve(EMPTY);
}

const loadProductReviews = unstable_cache(
  async (productId: string) => {
    try {
      return await backendFetch<{ summary: RatingSummary; reviews: PublicReview[] }>('storefront', 'reviews', {
        query: { productId },
        timeoutMs: 5000,
      });
    } catch (error) {
      console.error('Product reviews unavailable', error);
      return { summary: EMPTY.overall, reviews: [] };
    }
  },
  ['product-reviews'],
  { revalidate: 300, tags: [REVIEWS_TAG] },
);

export function getProductReviews(productId: string) {
  return isCheckoutEnabled() ? loadProductReviews(productId) : Promise.resolve({ summary: EMPTY.overall, reviews: [] });
}

/** "Ali Khan" -> "Ali K." so reviews don't show full names. */
export function publicName(name: string) {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toUpperCase()}.` : first || 'Customer';
}
