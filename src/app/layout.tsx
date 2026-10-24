import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import '@fontsource-variable/inter';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://batteryhub.com.pk'),
  title: {
    default: 'Battery HUB - Battery & Power Solutions',
    template: '%s | Battery HUB',
  },
  description:
    'Battery HUB sells batteries, chargers, power supplies, adapters and BMS boards for students, project builders and electronics users, delivered all over Pakistan.',
  keywords: [
    'battery store islamabad',
    'battery store rawalpindi',
    'chargers islamabad',
    'power supplies rawalpindi',
    'adapters pakistan',
    'lithium battery pakistan',
    'buy batteries online pakistan',
    'Battery HUB',
  ],
  authors: [{ name: 'Battery HUB' }],
  creator: 'Battery HUB',
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white font-sans text-slate-900 antialiased">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
