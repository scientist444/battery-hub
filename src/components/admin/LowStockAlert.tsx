import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export function LowStockAlert({ items }: { items: { name: string; stock: number; waiting: number }[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="flex items-center gap-2 font-bold">
        <AlertTriangle className="h-4 w-4" /> Low stock: {items.length} product{items.length === 1 ? '' : 's'}
      </p>
      <ul className="mt-2 space-y-1">
        {items.map((item) => (
          <li key={item.name}>
            <span className="font-semibold">{item.stock === 0 ? 'Sold out' : `${item.stock} left`}</span> · {item.name}
            {item.waiting > 0 && (
              <>
                {' · '}
                <Link href="/admin/requests" className="font-semibold text-blue-700 hover:underline">
                  {item.waiting} customer{item.waiting === 1 ? '' : 's'} waiting
                </Link>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
