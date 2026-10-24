'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { AlertCircle, Banknote, Building2, CheckCircle2, Copy, Loader2, MessageCircle, PackageCheck, ShoppingCart, Smartphone, Truck } from 'lucide-react';
import { useCart, formatRupees, parsePrice } from '@/context/CartContext';
import {
  type CheckoutCity,
  type CheckoutQuote,
  type PlacedOrder,
  getDeliveryQuote,
  placeOrder,
} from '@/app/(store)/checkout/actions';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { PAYMENT_OPTIONS, type PaymentMethod, createWhatsAppLink } from '@/config/store';

const DETAILS_KEY = 'battery-hub-checkout-details';

interface Details {
  name: string;
  phone: string;
  email: string;
  cityId: string;
  address: string;
  landmark: string;
  notes: string;
}

const EMPTY: Details = { name: '', phone: '', email: '', cityId: '', address: '', landmark: '', notes: '' };

const inputClass =
  'h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100';

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-700">
        {label} {optional && <span className="font-normal text-slate-400">(optional)</span>}
      </span>
      {children}
    </label>
  );
}

export function CheckoutForm({
  cities,
  citiesError,
  profile,
  signInEnabled,
}: {
  cities: CheckoutCity[];
  citiesError?: string;
  /** Saved details of the signed-in customer; undefined for guests. */
  profile?: Omit<Details, 'notes'>;
  signInEnabled?: boolean;
}) {
  const { items, total: cartTotal, clearCart } = useCart();
  const [details, setDetails] = useState<Details>(profile ? { ...profile, notes: '' } : EMPTY);
  const [quote, setQuote] = useState<CheckoutQuote>();
  const [quoteError, setQuoteError] = useState<string>();
  const [quoting, startQuote] = useTransition();
  const [placing, startPlacing] = useTransition();
  const [orderError, setOrderError] = useState<string>();
  const [placed, setPlaced] = useState<PlacedOrder>();
  const [payment, setPayment] = useState<PaymentMethod>('cod');
  const quoteRequest = useRef(0);

  // Guests: details remembered on this device from their last order (not the notes).
  // Signed-in customers start from their saved account details instead.
  const hasProfile = Boolean(profile);
  useEffect(() => {
    if (hasProfile) return;
    try {
      const saved = localStorage.getItem(DETAILS_KEY);
      if (saved) setDetails((d) => ({ ...d, ...(JSON.parse(saved) as Partial<Details>), notes: '' }));
    } catch {}
  }, [hasProfile]);

  const lines = useMemo(() => items.map((i) => ({ productId: i.product.id, qty: i.quantity })), [items]);
  const cartKey = JSON.stringify(lines);

  // Re-price whenever the city or the cart changes. Totals always come from the server.
  useEffect(() => {
    if (!details.cityId || lines.length === 0) {
      setQuote(undefined);
      return;
    }
    const request = ++quoteRequest.current;
    setQuoteError(undefined);
    startQuote(async () => {
      const result = await getDeliveryQuote(lines, details.cityId);
      if (request !== quoteRequest.current) return;
      if (result.ok) setQuote(result.data);
      else {
        setQuote(undefined);
        setQuoteError(result.error);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [details.cityId, cartKey]);

  const set = (key: keyof Details) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setDetails((d) => ({ ...d, [key]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quote) return;
    setOrderError(undefined);
    const { notes, ...customer } = details;
    startPlacing(async () => {
      const result = await placeOrder({
        items: lines,
        customer: { ...customer, email: customer.email || undefined, landmark: customer.landmark || undefined },
        notes,
        paymentMethod: payment,
        expectedTotalPkr: quote.totalPkr,
      });
      if (result.ok) {
        try {
          localStorage.setItem(DETAILS_KEY, JSON.stringify(customer));
        } catch {}
        setPlaced(result.data);
        clearCart();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        if (result.quote) setQuote(result.quote);
        setOrderError(result.error);
      }
    });
  };

  if (placed) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
        <h1 className="mt-4 text-2xl font-bold text-slate-950">Order placed</h1>
        <p className="mt-2 text-sm text-slate-600">
          Thank you, {details.name.split(' ')[0]}. Your order number is
        </p>
        <p className="mt-1 text-3xl font-bold tracking-wide text-blue-700">{placed.orderNumber}</p>
        <div className="mt-6 space-y-2 rounded-xl bg-slate-50 p-4 text-left text-sm">
          <Row label="Products" value={formatRupees(placed.subtotalPkr)} />
          <Row label="Delivery" value={formatRupees(placed.deliveryFeePkr)} />
          <Row
            label={placed.paymentMethod === 'cod' ? 'Pay on delivery (cash)' : `Pay now (${PAYMENT_OPTIONS[placed.paymentMethod as PaymentMethod]?.label ?? 'advance'})`}
            value={formatRupees(placed.totalPkr)}
            strong
          />
        </div>
        {placed.paymentMethod === 'jazzcash' || placed.paymentMethod === 'bank' ? (
          <PayNow method={placed.paymentMethod} orderNumber={placed.orderNumber} totalPkr={placed.totalPkr} />
        ) : (
          <p className="mt-4 text-sm text-slate-600">
            {placed.status === 'on_hold'
              ? 'We will call you on your number to confirm this order before we dispatch it.'
              : 'We will send your parcel by courier and share the tracking number. Keep the cash amount ready on delivery.'}
          </p>
        )}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href={`/track?order=${encodeURIComponent(placed.orderNumber)}`}
            className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
          >
            Track this order
          </Link>
          <Link href="/products" className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-bold text-slate-800 hover:border-slate-950">
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <ShoppingCart className="mx-auto h-14 w-14 text-slate-300" />
        <h1 className="mt-5 text-2xl font-bold text-slate-950">Your cart is empty</h1>
        <Link href="/products" className="mt-6 inline-flex rounded-lg bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700">
          Browse Products
        </Link>
      </div>
    );
  }

  const shipment = quote?.shipments[0];
  // Server prices once a city is chosen; the cart's prices before that.
  const summaryLines =
    quote?.items ??
    items.map((i) => ({ productId: i.product.id, name: i.product.name, qty: i.quantity, unitPricePkr: parsePrice(i.product.price) }));
  const canPlace = Boolean(quote) && !quoting && !placing;

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr,400px]">
      <div className="space-y-4">
        {signInEnabled && (
          <p className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-slate-700">
            {profile ? (
              <>Signed in as {profile.email}. This order will show in your account.</>
            ) : (
              <>
                <a href="/auth/google?next=/checkout" className="font-semibold text-blue-700">
                  Sign in with Google
                </a>{' '}
                to keep this order in your history and fill in your details next time. Or just continue as a guest.
              </>
            )}
          </p>
        )}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-950">1. Your details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <input required minLength={2} maxLength={80} autoComplete="name" value={details.name} onChange={set('name')} className={inputClass} />
            </Field>
            <Field label="Mobile number">
              <input
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="0300 1234567"
                value={details.phone}
                onChange={set('phone')}
                className={inputClass}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Email" optional>
                <input type="email" autoComplete="email" maxLength={120} value={details.email} onChange={set('email')} className={inputClass} />
              </Field>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-950">2. Delivery address</h2>
          {citiesError && (
            <p className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {citiesError}
            </p>
          )}
          <div className="grid gap-4">
            <Field label="City">
              <select required value={details.cityId} onChange={set('cityId')} className={inputClass}>
                <option value="">Select your city</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Full address">
              <textarea
                required
                minLength={10}
                maxLength={300}
                rows={3}
                autoComplete="street-address"
                placeholder="House / flat no., street, area"
                value={details.address}
                onChange={set('address')}
                className={cn(inputClass, 'h-auto py-2')}
              />
            </Field>
            <Field label="Nearest landmark" optional>
              <input maxLength={120} value={details.landmark} onChange={set('landmark')} className={inputClass} />
            </Field>
            <Field label="Order notes" optional>
              <textarea maxLength={500} rows={2} value={details.notes} onChange={set('notes')} className={cn(inputClass, 'h-auto py-2')} />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-950">3. Payment</h2>
          <div className="space-y-2" role="radiogroup" aria-label="Payment method">
            {(Object.keys(PAYMENT_OPTIONS) as PaymentMethod[]).map((method) => {
              const option = PAYMENT_OPTIONS[method];
              const Icon = method === 'cod' ? Banknote : method === 'jazzcash' ? Smartphone : Building2;
              const selected = payment === method;
              return (
                <label
                  key={method}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition',
                    selected ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-300',
                  )}
                >
                  <input type="radio" name="payment" value={method} checked={selected} onChange={() => setPayment(method)} className="sr-only" />
                  <Icon className={cn('h-6 w-6', selected ? 'text-blue-700' : 'text-slate-400')} />
                  <div>
                    <p className="text-sm font-bold text-slate-950">{option.label}</p>
                    <p className="text-xs text-slate-600">{option.hint}</p>
                  </div>
                </label>
              );
            })}
          </div>
          {payment !== 'cod' && (
            <p className="mt-3 text-xs leading-5 text-slate-600">
              After you place the order, we show the account details. Send the payment, then send us the screenshot on WhatsApp
              with your order number. We dispatch once the payment is received.
            </p>
          )}
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-950">Order summary</h2>
          <div className="space-y-2">
            {summaryLines.map((line) => (
              <div key={line.productId} className="flex justify-between gap-2 text-sm">
                <span className="truncate text-slate-600">
                  {line.name} × {line.qty}
                </span>
                <span className="shrink-0 font-semibold text-slate-800">{formatRupees(line.unitPricePkr * line.qty)}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
            <Row label="Products" value={formatRupees(quote?.subtotalPkr ?? cartTotal)} />
            <div className="flex justify-between">
              <span className="flex items-center gap-1.5 text-slate-600">
                <Truck className="h-4 w-4 text-orange-500" />
                Delivery{shipment ? ` (${shipment.chosen.name})` : ''}
              </span>
              <span className="font-semibold text-slate-800">
                {quoting ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                ) : quote ? (
                  formatRupees(quote.deliveryFeePkr)
                ) : (
                  <span className="text-xs font-normal text-slate-400">Select your city</span>
                )}
              </span>
            </div>
            {shipment?.chosen.etaDays && <p className="text-xs text-slate-500">Usually delivered in {shipment.chosen.etaDays} days</p>}
            <div className="flex justify-between border-t border-slate-100 pt-3 text-base font-bold text-slate-950">
              <span>Total</span>
              <span>{quote ? formatRupees(quote.totalPkr) : '—'}</span>
            </div>
          </div>

          {quoteError && (
            <p className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {quoteError}
            </p>
          )}
          {orderError && (
            <p className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {orderError}
            </p>
          )}

          <Button type="submit" variant="accent" size="lg" fullWidth className="mt-5" disabled={!canPlace}>
            {placing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
            {placing ? 'Placing order…' : quote ? `Place order · ${formatRupees(quote.totalPkr)}` : 'Place order'}
          </Button>
          <p className="mt-2 text-center text-xs text-slate-400">
            {payment === 'cod' ? 'Cash on delivery. No advance payment needed.' : `Pay by ${PAYMENT_OPTIONS[payment].label} after placing the order.`}
          </p>
        </div>
        <Link href="/cart" className="block text-center text-sm font-semibold text-blue-700 hover:text-blue-800">
          ← Back to cart
        </Link>
      </aside>
    </form>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn('flex justify-between', strong && 'border-t border-slate-200 pt-2 text-base font-bold text-slate-950')}>
      <span className={strong ? undefined : 'text-slate-600'}>{label}</span>
      <span className={strong ? undefined : 'font-semibold text-slate-800'}>{value}</span>
    </div>
  );
}

function PayNow({ method, orderNumber, totalPkr }: { method: 'jazzcash' | 'bank'; orderNumber: string; totalPkr: number }) {
  const { account, label } = PAYMENT_OPTIONS[method];
  const [copied, setCopied] = useState(false);
  const copy = () =>
    navigator.clipboard.writeText(account.number).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  const message =
    `Assalam o Alaikum, I placed order ${orderNumber} on Battery HUB and paid ${formatRupees(totalPkr)} ` +
    `by ${label}. Sending the payment screenshot.`;

  return (
    <div className="mt-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 text-left text-sm">
      <p className="font-bold text-slate-950">
        Send {formatRupees(totalPkr)} to:
      </p>
      <div className="mt-2 flex items-center justify-between rounded-lg bg-white px-3 py-2">
        <div>
          <p className="text-xs text-slate-500">
            {account.bank} · {account.title}
          </p>
          <p className="text-base font-bold tracking-wide text-slate-950">{account.number}</p>
        </div>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-blue-100 hover:text-blue-700"
        >
          {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-600">
        Then send the screenshot on WhatsApp with order number <strong>{orderNumber}</strong>. We dispatch once the payment is received.
      </p>
      <a
        href={createWhatsAppLink(message)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700"
      >
        <MessageCircle className="h-4 w-4" /> Send payment screenshot on WhatsApp
      </a>
    </div>
  );
}
