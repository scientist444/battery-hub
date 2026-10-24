'use server';

import { BackendError, apiProductId, backendFetch } from '@/lib/backend';
import { getCustomerSession } from '@/lib/customer';
import { publicName } from '@/lib/reviews';

export type ReviewResult = { ok: true; message: string } | { ok: false; message: string; signIn?: boolean };

export async function submitReview(input: { productId: string; rating: number; title?: string; body: string }): Promise<ReviewResult> {
  // The reviewer comes from the verified sign-in cookie, never from the browser.
  const session = await getCustomerSession();
  if (!session) return { ok: false, message: 'Please sign in to write a review.', signIn: true };
  try {
    await backendFetch('storefront', 'reviews/submit', {
      body: {
        accountId: session.accountId,
        productId: apiProductId(input.productId),
        name: publicName(session.name),
        rating: input.rating,
        title: input.title?.trim() || undefined,
        body: input.body,
      },
    });
    return { ok: true, message: 'Thank you! Your review will appear once we have checked it.' };
  } catch (error) {
    if (error instanceof BackendError) {
      const details = error.details as { fieldErrors?: Record<string, string[]> } | undefined;
      const field = details?.fieldErrors && Object.values(details.fieldErrors).flat()[0];
      return { ok: false, message: field ?? error.message };
    }
    console.error('Review submit failed', error);
    return { ok: false, message: 'Something went wrong. Please try again.' };
  }
}
