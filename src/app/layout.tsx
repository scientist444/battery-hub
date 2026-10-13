import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import '@fontsource-variable/inter';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Battery HUB - Battery & Power Solutions',
    template: '%s | Battery HUB',
  },
  description:
    'Battery HUB offers batteries, chargers, power supplies, and adapters for students, project builders, IoT developers, and electronics users in Islamabad and Rawalpindi.',
  keywords: [
    'battery store islamabad',
    'battery store rawalpindi',
    'chargers islamabad',
    'power supplies rawalpindi',
    'adapters pakistan',
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
