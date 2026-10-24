import { NextResponse, type NextRequest } from 'next/server';
import { CUSTOMER_COOKIE } from '@/lib/customer-session';

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/', request.url), 303);
  response.cookies.delete(CUSTOMER_COOKIE);
  return response;
}
