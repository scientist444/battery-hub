import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s | Battery HUB Admin' },
  robots: { index: false, follow: false },
  // Installable as a phone app ("Battery HUB Admin") with new-order notifications.
  manifest: '/admin-app/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'BH Admin', statusBarStyle: 'default' },
  icons: { apple: '/admin-app/apple-touch-icon.png' },
};

export const viewport: Viewport = { themeColor: '#0f172a' };

/** Admin shell: deliberately separate from the customer storefront (no cart, navbar or footer). */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-100">{children}</div>;
}
