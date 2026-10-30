'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

/** The installed app has no browser reload button, so phones get one in the header. */
export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      className="p-2 text-slate-600 hover:text-slate-950 lg:hidden"
      aria-label="Refresh"
    >
      <RefreshCw className={pending ? 'h-5 w-5 animate-spin' : 'h-5 w-5'} />
    </button>
  );
}
