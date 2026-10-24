import { container, queryAll, readDoc } from './cosmos';
import { HttpError } from './http';
import { Order, Review } from './types';

export const reviewPartition = (productId: string) => `review:${productId}`;
export const reviewId = (accountId: string, productId: string) => `rev_${accountId}_${productId}`.slice(0, 250);

export interface RatingSummary {
  average: number;
  count: number;
  /** Count of 1 to 5 star reviews, index 0 = 1 star. */
  stars: [number, number, number, number, number];
}

export function summarize(reviews: Pick<Review, 'rating'>[]): RatingSummary {
  const stars: RatingSummary['stars'] = [0, 0, 0, 0, 0];
  for (const r of reviews) stars[r.rating - 1] += 1;
  const count = reviews.length;
  const average = count ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10 : 0;
  return { average, count, stars };
}

export function publicReview(r: Review) {
  return { id: r.id, productId: r.productId, productName: r.productName, name: r.name, rating: r.rating, title: r.title, body: r.body, createdAt: r.createdAt };
}

export function approvedReviews(productId: string) {
  return queryAll<Review>(
    'customers',
    "SELECT * FROM c WHERE c.phone = @p AND c.type = 'review' AND c.status = 'approved' ORDER BY c.createdAt DESC",
    [{ name: '@p', value: reviewPartition(productId) }],
  );
}

/** Only customers whose order with this product was delivered may review it. */
export async function deliveredOrderWith(accountId: string, productId: string) {
  const [order] = await queryAll<Pick<Order, 'number' | 'items'>>(
    'orders',
    "SELECT TOP 1 c.number, c.items FROM c WHERE c.accountId = @a AND c.status = 'delivered' AND EXISTS(SELECT VALUE i FROM i IN c.items WHERE i.productId = @p) ORDER BY c.createdAt DESC",
    [
      { name: '@a', value: accountId },
      { name: '@p', value: productId },
    ],
  );
  return order;
}

export async function setReviewStatus(id: string, productId: string, status: Review['status']) {
  const found = await readDoc<Review>('customers', id, reviewPartition(productId));
  if (!found) throw new HttpError(404, 'Review not found.');
  const next = { ...found.doc, status, updatedAt: new Date().toISOString() };
  await container('customers').items.upsert(next);
  return next;
}
