import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s | Battery HUB Admin' },
  robots: { index: false, follow: false },
  // Installable as a phone app ("Battery HUB Admin") with new-order notifications.
  manifest: '/admin-app/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'BH Admin', statusBarStyle: 'default' },
  icons: { apple: '/admin-app/apple-touch-icon.png' },
};

// viewport-fit=cover lets the iPhone app use the full screen; the header and tab bar pad for the notch and home bar.
export const viewport: Viewport = { themeColor: '#ffffff', viewportFit: 'cover' };

/** Admin shell: deliberately separate from the customer storefront (no cart, navbar or footer). */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-shell min-h-screen bg-slate-100">{children}</div>;
}
