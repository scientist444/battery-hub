import { NextResponse, type NextRequest } from 'next/server';
import { OAUTH_COOKIE, createOAuthState, googleRedirectUri, isGoogleSignInEnabled, safeNextPath } from '@/lib/customer-session';

export const dynamic = 'force-dynamic';

/** Start Google sign-in: remember state and nonce in a short-lived cookie, then send the customer to Google. */
export async function GET(request: NextRequest) {
  if (!isGoogleSignInEnabled()) return NextResponse.redirect(new URL('/account', request.url));

  const state = crypto.randomUUID();
  const nonce = crypto.randomUUID();
  const next = safeNextPath(request.nextUrl.searchParams.get('next'));

  const google = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  google.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: googleRedirectUri(request),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    nonce,
    prompt: 'select_account',
  }).toString();

  const response = NextResponse.redirect(google);
  response.cookies.set(OAUTH_COOKIE, await createOAuthState({ state, nonce, next }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/auth/google',
    maxAge: 600,
  });
  return response;
}
