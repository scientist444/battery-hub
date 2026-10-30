import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireAdmin } from '@/lib/admin-session';
import { ProductForm } from '@/components/admin/ProductForm';
import { isBlobConfigured } from '@/lib/blob';

export const metadata: Metadata = { title: 'Add product' };

export default async function NewProductPage() {
  await requireAdmin();
  const uploadsEnabled = isBlobConfigured();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-950">
        <ArrowLeft className="h-4 w-4" /> Back to products
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-slate-950">Add product</h1>
      <ProductForm uploadsEnabled={uploadsEnabled} />
    </div>
  );
}
