'use client';

import { Printer } from 'lucide-react';

/** Opens the browser's print dialog, where "Save as PDF" downloads the page. */
export function PrintButton({ label = 'Download PDF / Print' }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 print:hidden"
    >
      <Printer className="h-4 w-4" /> {label}
    </button>
  );
}
