'use client';

import { useState, useTransition } from 'react';
import { RefreshCw } from 'lucide-react';
import { syncCatalog } from '@/app/admin/backend-actions';
import { Button } from '@/components/ui/Button';

/** Products sync to the ordering backend on every save; this pushes everything again (first setup, or after an error). */
export function SyncCatalogButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string }>();

  return (
    <div className="flex items-center gap-2">
      {result && <span className={result.ok ? 'text-xs text-emerald-700' : 'text-xs text-red-700'}>{result.message}</span>}
      <Button variant="outline" disabled={pending} onClick={() => startTransition(async () => setResult(await syncCatalog()))}>
        <RefreshCw className={pending ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /> Sync to checkout
      </Button>
    </div>
  );
}
