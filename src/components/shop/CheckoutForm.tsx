'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { AlertCircle, Banknote, CheckCircle2, Loader2, PackageCheck, ShoppingCart, Truck } from 'lucide-react';
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

export function CheckoutForm({ cities, citiesError }: { cities: CheckoutCity[]; citiesError?: string }) {
  const { items, total: cartTotal, clearCart } = useCart();
  const [details, setDetails] = useState<Details>(EMPTY);
  const [quote, setQuote] = useState<CheckoutQuote>();
  const [quoteError, setQuoteError] = useState<string>();
  const [quoting, startQuote] = useTransition();
  const [placing, startPlacing] = useTransition();
  const [orderError, setOrderError] = useState<string>();
  const [placed, setPlaced] = useState<PlacedOrder>();
  const quoteRequest = useRef(0);

  // Remember the customer's details on this device for next time (not the notes).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DETAILS_KEY);
      if (saved) setDetails((d) => ({ ...d, ...(JSON.parse(saved) as Partial<Details>), notes: '' }));
    } catch {}
  }, []);

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
          <Row label="Pay on delivery (cash)" value={formatRupees(placed.totalPkr)} strong />
        </div>
        <p className="mt-4 text-sm text-slate-600">
          {placed.status === 'on_hold'
            ? 'We will call you on your number to confirm this order before we dispatch it.'
            : 'We will send your parcel by courier and share the tracking number. Keep the cash amount ready on delivery.'}
        </p>
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
          <div className="flex items-center gap-3 rounded-xl border-2 border-blue-600 bg-blue-50 p-4">
            <Banknote className="h-6 w-6 text-blue-700" />
            <div>
              <p className="text-sm font-bold text-slate-950">Cash on Delivery</p>
              <p className="text-xs text-slate-600">Pay the courier in cash when your parcel arrives.</p>
            </div>
          </div>
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
          <p className="mt-2 text-center text-xs text-slate-400">Cash on delivery. No advance payment needed.</p>
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
