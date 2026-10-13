'use client';

import { useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { RotateCcw, Search, Trash2, Undo2 } from 'lucide-react';
import { Product, ProductOverride } from '@/types';
import { categoryLabels } from '@/data/products';
import { STORE_CATEGORIES } from '@/config/store';
import { parsePrice } from '@/lib/format';
import { applyOverride } from '@/lib/catalog-merge';
import { removeProduct, resetProduct, restoreProduct, updateProduct } from '@/app/admin/actions';
import { Button } from '@/components/ui/Button';
import { StockBadge } from '@/components/ui/StockBadge';
import { TextField } from '@/components/admin/TextField';

export interface AdminProductRow {
  product: Product;
  override?: ProductOverride;
  /** Created from the admin panel (deleting it is permanent). */
  custom: boolean;
  /** Spreadsheet product hidden from the store (can be restored). */
  removed: boolean;
}

interface ProductManagerProps {
  rows: AdminProductRow[];
  disabled?: boolean;
}

export function ProductManager({ rows: allRows, disabled }: ProductManagerProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allRows.filter(
      ({ product: p }) =>
        (!category || p.category === category) &&
        (!q || `${p.id} ${p.name}`.toLowerCase().includes(q)),
    );
  }, [allRows, query, category]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or SKU"
            className="h-10 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-slate-950"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-950"
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {STORE_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        <p className="text-sm text-slate-500">{rows.length} products</p>
      </div>

      <div className="hidden grid-cols-[1fr,120px,120px,110px,190px] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 lg:grid">
        <span>Product</span>
        <span>Price (Rs.)</span>
        <span>Stock (units)</span>
        <span>Status</span>
        <span />
      </div>

      <ul className="divide-y divide-slate-200">
        {rows.map((row) => (
          <ProductRow key={row.product.id} row={row} disabled={disabled} />
        ))}
      </ul>
    </div>
  );
}

function ProductRow({ row, disabled }: { row: AdminProductRow; disabled?: boolean }) {
  const { product, override, custom, removed } = row;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [price, setPrice] = useState(override?.price?.toString() ?? '');
  const [stock, setStock] = useState(override?.stock?.toString() ?? '');

  const defaultPrice = parsePrice(product.price);
  const dirty = price !== (override?.price?.toString() ?? '') || stock !== (override?.stock?.toString() ?? '');
  const preview = applyOverride(product, {
    price: price === '' ? undefined : Number(price),
    stock: stock === '' ? undefined : Number(stock),
  });

  const run = (action: () => Promise<{ ok: boolean; message: string }>) =>
    startTransition(async () => {
      const result = await action();
      setMessage({ ok: result.ok, text: result.message });
      if (result.ok) router.refresh();
    });

  const save = (formData: FormData) => run(() => updateProduct(formData));
  const reset = () =>
    run(async () => {
      const result = await resetProduct(product.id);
      if (result.ok) {
        setPrice('');
        setStock('');
      }
      return result;
    });
  const remove = () => {
    const warning = custom
      ? `Delete "${product.name}" permanently? This cannot be undone.`
      : `Remove "${product.name}" from the store? You can restore it later.`;
    if (window.confirm(warning)) run(() => removeProduct(product.id));
  };
  const restore = () => run(() => restoreProduct(product.id));

  return (
    <li className={removed ? 'bg-slate-50 opacity-60' : undefined}>
      <form action={save} className="grid items-center gap-3 p-4 lg:grid-cols-[1fr,120px,120px,110px,190px] lg:gap-4">
        <input type="hidden" name="id" value={product.id} />
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-slate-50 ring-1 ring-slate-200">
            <Image src={product.image} alt="" fill sizes="48px" className="object-contain p-1" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">{product.name}</p>
            <p className="text-xs text-slate-500">
              {product.id} · {categoryLabels[product.category]}
              {custom && <span className="ml-2 rounded bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700">New</span>}
              {override && <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 font-medium text-blue-700">Edited</span>}
              {removed && <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 font-medium text-red-700">Removed from store</span>}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:contents">
          <TextField
            label="Price (Rs.)"
            hideLabel
            name="price"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder={String(defaultPrice)}
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ''))}
            disabled={disabled || removed}
          />
          <TextField
            label="Stock (units)"
            hideLabel
            name="stock"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder={product.stockQty?.toString() ?? 'Not tracked'}
            value={stock}
            onChange={(e) => setStock(e.target.value.replace(/[^0-9]/g, ''))}
            disabled={disabled || removed}
          />
        </div>

        <div>
          <StockBadge product={preview} />
        </div>

        <div className="flex items-center gap-2 lg:justify-end">
          {message && (!message.ok || !dirty) && (
            <span className={`text-xs ${message.ok ? 'text-emerald-600' : 'text-red-600'}`}>{message.text}</span>
          )}
          {removed ? (
            <Button variant="outline" size="sm" onClick={restore} disabled={disabled || pending}>
              <Undo2 className="h-4 w-4" /> Restore
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={remove} disabled={disabled || pending} title="Remove product" aria-label="Remove product" className="text-red-600 hover:bg-red-50">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          {override && !removed && (
            <Button variant="ghost" size="sm" onClick={reset} disabled={disabled || pending} title="Reset to catalog defaults" aria-label="Reset to catalog defaults">
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          {!removed && (
            <Button type="submit" size="sm" disabled={disabled || pending || !dirty}>
              {pending ? 'Saving...' : 'Save'}
            </Button>
          )}
        </div>
      </form>
    </li>
  );
}
