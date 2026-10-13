import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s | Battery HUB Admin' },
  robots: { index: false, follow: false },
};

/** Admin shell: deliberately separate from the customer storefront (no cart, navbar or footer). */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-100">{children}</div>;
}
