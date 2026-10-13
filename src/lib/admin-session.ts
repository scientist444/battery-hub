import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, verifySessionToken } from '@/lib/auth';

export async function getAdminSession() {
  return verifySessionToken(cookies().get(ADMIN_COOKIE)?.value);
}

/** Server-side guard for admin pages and actions; middleware is only the first layer. */
export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  return session;
}
