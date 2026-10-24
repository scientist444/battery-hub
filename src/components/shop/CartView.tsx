'use client';

import Image from 'next/image';
import Link from 'next/link';
import { AlertCircle, ArrowRight, Banknote, CheckCircle2, Copy, MapPin, MessageCircle, Minus, Package, Plus, ShoppingCart, Trash2, Truck } from 'lucide-react';
import { useState } from 'react';
import { useCart, formatRupees, parsePrice } from '@/context/CartContext';
import { createWhatsAppLink } from '@/config/store';
import { maxOrderQty } from '@/lib/stock';

const SADAPAY_NUMBER = '03305486054';
const ACCOUNT_NAME = 'Muhammad Umer Sajid';
const ACCOUNT_NETWORK = 'SadaPay';

function buildWhatsAppMessage(
  items: { name: string; id: string; price: string; qty: number }[],
  total: number,
): string {
  const lines = items
    .map((it, idx) => `${idx + 1}. ${it.name} (ID: ${it.id}) × ${it.qty} — ${it.price} each`)
    .join('\n');

  return (
    `Assalam o Alaikum, I want to place an order from Battery HUB.\n\n` +
    `🛒 *My Order:*\n${lines}\n\n` +
    `*Estimated Total: ${formatRupees(total)}*\n` +
    `(Bykea delivery charges will be added based on my address)\n\n` +
    `✅ I have paid *${formatRupees(total)}* to ${ACCOUNT_NETWORK}: ${SADAPAY_NUMBER} (${ACCOUNT_NAME})\n\n` +
    `📦 *My delivery address:* [I will add my address below]\n\n` +
    `I am sending the payment screenshot along with this message. Please confirm my order.`
  );
}

export function CartView({ checkoutEnabled }: { checkoutEnabled: boolean }) {
  const { items, itemCount, total, removeItem, updateQuantity, clearCart } = useCart();
  const [copied, setCopied] = useState(false);

  const copyNumber = () => {
    navigator.clipboard.writeText(SADAPAY_NUMBER).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const whatsappMessage = buildWhatsAppMessage(
    items.map((i) => ({
      name: i.product.name,
      id: i.product.id,
      price: i.product.price,
      qty: i.quantity,
    })),
    total,
  );

  const whatsappHref = createWhatsAppLink(whatsappMessage);

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] bg-slate-50 py-16">
        <div className="container-custom">
          <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <ShoppingCart className="mx-auto h-14 w-14 text-slate-300" />
            <h1 className="mt-5 text-2xl font-bold text-slate-950">Your cart is empty</h1>
            <p className="mt-2 text-sm text-slate-500">
              Browse products and add items to your cart to place an order.
            </p>
            <Link
              href="/products"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 lg:py-14">
      <div className="container-custom">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Your Cart
            <span className="ml-2 text-lg font-semibold text-slate-400">({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
          </h1>
          <button
            type="button"
            onClick={clearCart}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 transition hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
            Clear all
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr,400px]">
          {/* Cart items */}
          <div className="space-y-3">
            {items.map((item) => {
              const itemTotal = parsePrice(item.product.price) * item.quantity;
              return (
                <div
                  key={item.product.id}
                  className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <Link href={`/products/${item.product.slug}`} className="shrink-0">
                    <div className="relative h-20 w-20 overflow-hidden rounded-lg bg-slate-50">
                      <Image
                        src={item.product.image}
                        alt={item.product.name}
                        fill
                        sizes="80px"
                        className="object-contain p-1.5"
                      />
                    </div>
                  </Link>

                  <div className="flex flex-1 flex-col gap-2 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/products/${item.product.slug}`}>
                        <p className="text-sm font-bold leading-5 text-slate-900 hover:text-blue-700 line-clamp-2">
                          {item.product.name}
                        </p>
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeItem(item.product.id)}
                        className="shrink-0 rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-500">{item.product.price} each</p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="flex h-6 w-6 items-center justify-center rounded text-slate-500 transition hover:bg-white hover:text-red-600"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-8 text-center text-sm font-bold text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          disabled={item.quantity >= (maxOrderQty(item.product) ?? Infinity)}
                          className="flex h-6 w-6 items-center justify-center rounded text-slate-500 transition hover:bg-white hover:text-blue-600 disabled:opacity-30"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="text-sm font-bold text-slate-950">{formatRupees(itemTotal)}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            <Link
              href="/products"
              className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800"
            >
              + Add more products
            </Link>
          </div>

          {/* Order summary + payment */}
          <div className="space-y-4">
            {/* Order summary */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-slate-950">Order Summary</h2>
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.product.id} className="flex justify-between text-sm">
                    <span className="text-slate-600 truncate pr-2">{item.product.name} × {item.quantity}</span>
                    <span className="shrink-0 font-semibold text-slate-800">
                      {formatRupees(parsePrice(item.product.price) * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 border-t border-slate-100 pt-4">
                <div className="flex justify-between text-base font-bold">
                  <span className="text-slate-950">Products Total</span>
                  <span className="text-slate-950">{formatRupees(total)}</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                  <Truck className="h-3.5 w-3.5 text-orange-500" />
                  {checkoutEnabled ? 'Delivery fee added at checkout' : 'Bykea delivery charges added on WhatsApp'}
                </div>
              </div>
            </div>

            {checkoutEnabled ? (
              <div className="rounded-2xl border-2 border-blue-100 bg-white p-5 shadow-sm">
                <div className="mb-4 space-y-2 text-sm text-slate-600">
                  <p className="flex items-center gap-2">
                    <Truck className="h-4 w-4 shrink-0 text-orange-500" />
                    Delivery all over Pakistan. The fee is worked out from your city at checkout.
                  </p>
                  <p className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 shrink-0 text-emerald-600" />
                    Cash on delivery. No advance payment.
                  </p>
                </div>
                <Link
                  href="/checkout"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]"
                >
                  Proceed to checkout
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
            <>
            {/* Payment instructions */}
            <div className="rounded-2xl border-2 border-blue-100 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-slate-950">How to Order</h2>

              {/* Step 1 */}
              <div className="mb-4 rounded-xl bg-emerald-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">1</span>
                  <p className="text-sm font-bold text-slate-950">Pay via SadaPay</p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                    <div>
                      <p className="text-xs text-slate-500">Account Number</p>
                      <p className="text-base font-bold tracking-wide text-slate-950">{SADAPAY_NUMBER}</p>
                    </div>
                    <button
                      type="button"
                      onClick={copyNumber}
                      className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-blue-100 hover:text-blue-700"
                    >
                      {copied ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="flex justify-between rounded-lg bg-white px-3 py-2 text-xs">
                    <span className="text-slate-500">Account Name</span>
                    <span className="font-bold text-slate-950">{ACCOUNT_NAME}</span>
                  </div>
                  <div className="flex justify-between rounded-lg bg-white px-3 py-2 text-xs">
                    <span className="text-slate-500">Network</span>
                    <span className="font-bold text-emerald-700">{ACCOUNT_NETWORK}</span>
                  </div>
                  <div className="flex justify-between rounded-lg bg-white px-3 py-2 text-xs">
                    <span className="text-slate-500">Amount to Pay</span>
                    <span className="font-bold text-slate-950">{formatRupees(total)} + delivery</span>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="mb-4 rounded-xl bg-blue-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">2</span>
                  <p className="text-sm font-bold text-slate-950">Send order on WhatsApp</p>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
                    Screenshot of your payment
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
                    Screenshot of this cart page
                  </li>
                  <li className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500" />
                    Your <strong>exact delivery address</strong> (Bykea charges depend on location)
                  </li>
                </ul>
              </div>

              {/* Delivery note */}
              <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-orange-200 bg-orange-50 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                <p className="text-xs leading-5 text-orange-800">
                  <strong>Bykea delivery charges</strong> are based on your distance. Please
                  include your exact address so we can confirm the delivery fee with you before
                  dispatching.
                </p>
              </div>

              {/* WhatsApp button */}
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98]"
              >
                <MessageCircle className="h-5 w-5" />
                Confirm Order on WhatsApp
              </a>
              <p className="mt-2 text-center text-xs text-slate-400">
                This will open WhatsApp with your order details pre-filled
              </p>
            </div>

            {/* What happens next */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-950">What happens next?</h3>
              </div>
              <ol className="space-y-2 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600">1</span>
                  We confirm your order and payment on WhatsApp
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600">2</span>
                  We book a Bykea rider and share the estimated delivery fee
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600">3</span>
                  Bykea delivers to your exact address in Islamabad / Rawalpindi
                </li>
              </ol>
            </div>
            </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
