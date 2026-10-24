import { NextResponse, type NextRequest } from 'next/server';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import {
  CUSTOMER_COOKIE,
  CUSTOMER_SESSION_TTL_SECONDS,
  OAUTH_COOKIE,
  createCustomerToken,
  isGoogleSignInEnabled,
  googleRedirectUri,
  verifyOAuthState,
} from '@/lib/customer-session';

export const dynamic = 'force-dynamic';

const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

function fail(request: NextRequest, reason: string) {
  console.error('Google sign-in failed:', reason);
  const url = new URL('/account', request.url);
  url.searchParams.set('error', 'signin');
  const response = NextResponse.redirect(url);
  response.cookies.delete({ name: OAUTH_COOKIE, path: '/auth/google' });
  return response;
}

/** Google sends the customer back here with a one-time code; exchange it and check the signed ID token. */
export async function GET(request: NextRequest) {
  if (!isGoogleSignInEnabled()) return NextResponse.redirect(new URL('/account', request.url));
  const params = request.nextUrl.searchParams;
  const saved = await verifyOAuthState(request.cookies.get(OAUTH_COOKIE)?.value);
  if (!saved || !params.get('state') || params.get('state') !== saved.state) return fail(request, 'state mismatch');
  const code = params.get('code');
  if (!code) return fail(request, params.get('error') ?? 'no code');

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: googleRedirectUri(request),
      grant_type: 'authorization_code',
    }),
    cache: 'no-store',
  }).catch(() => undefined);
  const tokens = (await tokenResponse?.json().catch(() => undefined)) as { id_token?: string } | undefined;
  if (!tokenResponse?.ok || !tokens?.id_token) return fail(request, `token exchange ${tokenResponse?.status ?? 'unreachable'}`);

  let claims;
  try {
    ({ payload: claims } = await jwtVerify(tokens.id_token, googleKeys, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: process.env.GOOGLE_CLIENT_ID!,
    }));
  } catch {
    return fail(request, 'invalid id token');
  }
  if (claims.nonce !== saved.nonce || !claims.sub || !claims.email || claims.email_verified !== true) {
    return fail(request, 'nonce or email not verified');
  }

  const response = NextResponse.redirect(new URL(saved.next, request.url));
  response.cookies.delete({ name: OAUTH_COOKIE, path: '/auth/google' });
  response.cookies.set(
    CUSTOMER_COOKIE,
    await createCustomerToken({
      accountId: `acct_g${claims.sub}`,
      email: String(claims.email),
      name: String(claims.name ?? claims.email),
      picture: typeof claims.picture === 'string' ? claims.picture : undefined,
    }),
    { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: CUSTOMER_SESSION_TTL_SECONDS },
  );
  return response;
}
