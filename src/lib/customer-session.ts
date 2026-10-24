import { SignJWT, jwtVerify } from 'jose';

/**
 * Customer sign-in (Google). The session is a signed cookie; no passwords are stored.
 *
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET  OAuth client from Google Cloud Console
 *   CUSTOMER_SESSION_SECRET                 optional; derived from ADMIN_SESSION_SECRET when unset
 */
export const CUSTOMER_COOKIE = 'bh_customer';
export const OAUTH_COOKIE = 'bh_oauth';
export const CUSTOMER_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export interface CustomerSession {
  accountId: string;
  email: string;
  name: string;
  picture?: string;
}

function getSecret() {
  const own = process.env.CUSTOMER_SESSION_SECRET;
  if (own && own.length >= 32) return new TextEncoder().encode(own);
  const admin = process.env.ADMIN_SESSION_SECRET;
  // A different key from the admin session, so one cookie can never pass as the other.
  return admin && admin.length >= 32 ? new TextEncoder().encode(`${admin}:customer-session`) : null;
}

export function isGoogleSignInEnabled() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && getSecret());
}

async function sign(payload: Record<string, unknown>, subject: string, ttlSeconds: number) {
  const secret = getSecret();
  if (!secret) throw new Error('Customer sign-in needs ADMIN_SESSION_SECRET or CUSTOMER_SESSION_SECRET.');
  return new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setSubject(subject).setIssuedAt().setExpirationTime(`${ttlSeconds}s`).sign(secret);
}

async function verify(token: string | undefined) {
  const secret = getSecret();
  if (!token || !secret) return null;
  try {
    return (await jwtVerify(token, secret, { algorithms: ['HS256'] })).payload;
  } catch {
    return null;
  }
}

export function createCustomerToken(session: CustomerSession) {
  const { accountId, ...rest } = session;
  return sign({ ...rest, kind: 'customer' }, accountId, CUSTOMER_SESSION_TTL_SECONDS);
}

export async function verifyCustomerToken(token: string | undefined): Promise<CustomerSession | null> {
  const payload = await verify(token);
  if (!payload || payload.kind !== 'customer' || !payload.sub) return null;
  return {
    accountId: payload.sub,
    email: String(payload.email ?? ''),
    name: String(payload.name ?? ''),
    picture: typeof payload.picture === 'string' ? payload.picture : undefined,
  };
}

/** Short-lived state for one Google sign-in round trip (CSRF state, nonce, where to return). */
export function createOAuthState(state: { state: string; nonce: string; next: string }) {
  return sign({ ...state, kind: 'oauth' }, 'oauth', 600);
}

export async function verifyOAuthState(token: string | undefined) {
  const payload = await verify(token);
  if (!payload || payload.kind !== 'oauth') return null;
  return { state: String(payload.state), nonce: String(payload.nonce), next: String(payload.next) };
}

/** Only same-site paths, so the return address can't send people to another site. */
export function safeNextPath(next: string | null | undefined) {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/account';
}

/** Google redirect address, built from the host the customer is actually on (www or not). */
export function googleRedirectUri(request: { headers: Headers; nextUrl: URL }) {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? request.nextUrl.host;
  const proto = request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol.replace(':', '');
  return `${proto}://${host}/auth/google/callback`;
}
