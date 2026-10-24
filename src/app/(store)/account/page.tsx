import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertCircle, LogOut, MessageCircle, PackageSearch, UserRound } from 'lucide-react';
import { createWhatsAppLink } from '@/config/store';
import { isCheckoutEnabled } from '@/lib/backend';
import { isGoogleSignInEnabled } from '@/lib/customer-session';
import { type CustomerAccount, getAccount, getCustomerSession, getOrderHistory } from '@/lib/customer';
import { getCheckoutCities } from '@/app/(store)/checkout/actions';
import { OrderHistory } from '@/components/account/OrderHistory';
import { AccountSettingsForm } from '@/components/account/AccountSettingsForm';
import type { TrackedOrder } from '@/app/(store)/checkout/actions';

export const metadata: Metadata = { title: 'My account' };
export const dynamic = 'force-dynamic';

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[60vh] bg-slate-50 py-10 lg:py-14">
      <div className="container-custom max-w-4xl">{children}</div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export default async function AccountPage({ searchParams }: { searchParams: { error?: string } }) {
  // Before sign-in is set up: point customers to WhatsApp and order tracking.
  if (!isGoogleSignInEnabled() || !isCheckoutEnabled()) {
    return (
      <Shell>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <UserRound className="h-8 w-8 text-blue-700" />
          <h1 className="mt-4 text-2xl font-bold text-slate-950">Your orders</h1>
          <p className="mt-2 text-sm text-slate-600">Ask us about any order on WhatsApp.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={createWhatsAppLink('Assalam o Alaikum, I want to ask about my order.')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700"
            >
              <MessageCircle className="h-4 w-4" /> Contact WhatsApp
            </a>
            <Link href="/products" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-5 py-3 text-sm font-bold text-slate-900">
              <PackageSearch className="h-4 w-4" /> Continue shopping
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  const session = await getCustomerSession();
  if (!session) {
    return (
      <Shell>
        <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <UserRound className="mx-auto h-10 w-10 text-blue-700" />
          <h1 className="mt-4 text-2xl font-bold text-slate-950">Sign in to your account</h1>
          <p className="mt-2 text-sm text-slate-600">See your order history and save your delivery details for faster checkout.</p>
          {searchParams.error && (
            <p className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-left text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> Sign-in didn&apos;t complete. Please try again.
            </p>
          )}
          <a
            href="/auth/google?next=/account"
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-sm hover:bg-slate-50"
          >
            <GoogleIcon /> Continue with Google
          </a>
          <p className="mt-4 text-xs text-slate-500">
            No account needed to order. <Link href="/track" className="font-semibold text-blue-700">Track an order</Link> with its number.
          </p>
        </div>
      </Shell>
    );
  }

  let account: CustomerAccount | undefined;
  let orders: TrackedOrder[] = [];
  let loadError: string | undefined;
  try {
    [account, orders] = await Promise.all([getAccount(session.accountId), getOrderHistory(session.accountId)]);
  } catch (error) {
    console.error('Account load failed', error);
    loadError = 'We could not load your account right now. Please refresh in a minute.';
  }
  const cities = await getCheckoutCities();

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">My account</h1>
          <p className="mt-1 text-sm text-slate-500">
            {account?.name ?? session.name} · {session.email}
          </p>
        </div>
        <form action="/auth/logout" method="post">
          <button type="submit" className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-red-600">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </form>
      </div>
      {loadError && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{loadError}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr,340px]">
        <section>
          <h2 className="mb-3 text-lg font-bold text-slate-950">Order history</h2>
          <OrderHistory orders={orders} />
        </section>
        <section>
          <h2 className="mb-3 text-lg font-bold text-slate-950">Account settings</h2>
          <AccountSettingsForm
            email={session.email}
            account={{ name: account?.name ?? session.name, mobile: account?.mobile, address: account?.address }}
            cities={cities.ok ? cities.data : []}
          />
        </section>
      </div>
    </Shell>
  );
}
