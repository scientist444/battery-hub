import { app } from '@azure/functions';
import { container, queryAll, readDoc } from '../lib/cosmos';
import { HttpError, json, parseBody, route } from '../lib/http';
import { approvedReviews, deliveredOrderWith, publicReview, reviewId, reviewPartition, setReviewStatus, summarize } from '../lib/reviews';
import { Review } from '../lib/types';
import { accountId, reviewSchema, reviewStatusSchema } from '../lib/validation';

// ---------- Storefront ----------

app.http('productReviews', {
  methods: ['GET'],
  route: 'reviews',
  authLevel: 'anonymous',
  handler: route('storefront', async (request) => {
    const productId = request.query.get('productId')?.trim();
    if (!productId) throw new HttpError(400, 'productId is required.');
    const reviews = await approvedReviews(productId);
    return json({ summary: summarize(reviews), reviews: reviews.slice(0, 50).map(publicReview) });
  }),
});

/** Ratings of every product (for product cards) and the latest reviews (for the home page). */
app.http('reviewsOverview', {
  methods: ['GET'],
  route: 'reviews/overview',
  authLevel: 'anonymous',
  handler: route('storefront', async () => {
    const reviews = await queryAll<Review>('customers', "SELECT * FROM c WHERE c.type = 'review' AND c.status = 'approved'");
    const byProduct = new Map<string, Review[]>();
    for (const r of reviews) byProduct.set(r.productId, [...(byProduct.get(r.productId) ?? []), r]);
    const products = Object.fromEntries([...byProduct].map(([id, list]) => [id, (({ average, count }) => ({ average, count }))(summarize(list))]));
    const latest = [...reviews].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6).map(publicReview);
    return json({ overall: summarize(reviews), products, latest });
  }),
});

app.http('submitReview', {
  methods: ['POST'],
  route: 'reviews/submit',
  authLevel: 'anonymous',
  handler: route('storefront', async (request) => {
    const body = await parseBody(request, reviewSchema);
    const order = await deliveredOrderWith(body.accountId, body.productId);
    if (!order) {
      throw new HttpError(403, 'You can review a product once an order with it has been delivered to you.');
    }
    const id = reviewId(body.accountId, body.productId);
    const existing = await readDoc<Review>('customers', id, reviewPartition(body.productId));
    const now = new Date().toISOString();
    const review: Review = {
      id,
      phone: reviewPartition(body.productId),
      type: 'review',
      productId: body.productId,
      productName: order.items.find((i) => i.productId === body.productId)?.name ?? body.productId,
      accountId: body.accountId,
      orderNumber: order.number,
      name: body.name,
      rating: body.rating,
      title: body.title || undefined,
      body: body.body,
      // Every new or edited review is checked by the admin before it shows.
      status: 'pending',
      createdAt: existing?.doc.createdAt ?? now,
      updatedAt: now,
    };
    await container('customers').items.upsert(review);
    return json({ ok: true, status: review.status });
  }),
});

/** The signed-in customer's own reviews, so the account page can show what they already reviewed. */
app.http('customerReviews', {
  methods: ['GET'],
  route: 'customer/reviews',
  authLevel: 'anonymous',
  handler: route('storefront', async (request) => {
    const id = accountId.parse(request.query.get('accountId'));
    const reviews = await queryAll<Review>('customers', "SELECT * FROM c WHERE c.type = 'review' AND c.accountId = @a", [{ name: '@a', value: id }]);
    return json({ reviews: reviews.map((r) => ({ ...publicReview(r), status: r.status })) });
  }),
});

// ---------- Admin ----------

app.http('adminReviews', {
  methods: ['GET'],
  route: 'manage/reviews',
  authLevel: 'anonymous',
  handler: route('admin', async (request) => {
    const status = request.query.get('status');
    const filter = status ? ' AND c.status = @s' : '';
    const reviews = await queryAll<Review>(
      'customers',
      `SELECT TOP 200 * FROM c WHERE c.type = 'review'${filter} ORDER BY c.updatedAt DESC`,
      status ? [{ name: '@s', value: status }] : [],
    );
    return json({ reviews });
  }),
});

app.http('adminReviewStatus', {
  methods: ['POST'],
  route: 'manage/reviews/{id}/status',
  authLevel: 'anonymous',
  handler: route('admin', async (request) => {
    const { productId, status } = await parseBody(request, reviewStatusSchema);
    const review = await setReviewStatus(request.params.id, productId, status);
    return json({ review });
  }),
});
