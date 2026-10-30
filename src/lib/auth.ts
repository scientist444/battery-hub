import { SignJWT, jwtVerify } from 'jose';

// Kept free of Node-only APIs so middleware (edge runtime) can import it.
export const ADMIN_COOKIE = 'bh_admin_session';
// 30 days, so the admin app on the phone stays signed in. Sign out on a shared device.
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
}

export function isAdminConfigured() {
  return Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD && getSecret());
}

export async function createSessionToken(username: string) {
  const secret = getSecret();
  if (!secret) throw new Error('ADMIN_SESSION_SECRET must be at least 32 characters.');
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(username)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret);
}

export async function verifySessionToken(token: string | undefined) {
  const secret = getSecret();
  if (!token || !secret) return null;
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    return payload.role === 'admin' && payload.sub ? { username: payload.sub } : null;
  } catch {
    return null;
  }
}
