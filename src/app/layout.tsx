import type { Metadata } from 'next';
import '@fontsource-variable/inter';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import WhatsAppButton from '@/components/ui/WhatsAppButton';
import RightSidebar from '@/components/layout/RightSidebar';
import { CartProvider } from '@/context/CartContext';

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
      <body className="bg-slate-50 font-sans text-slate-900 antialiased">
        <CartProvider>
          <Navbar />
          <main>{children}</main>
          <Footer />
          <WhatsAppButton />
          <RightSidebar />
        </CartProvider>
      </body>
    </html>
  );
}
