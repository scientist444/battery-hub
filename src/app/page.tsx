import type { Metadata } from 'next';
import Hero from '@/components/home/Hero';
import Categories from '@/components/home/Categories';
import ProductSections from '@/components/home/ProductSections';
import CalculatorSection from '@/components/home/CalculatorSection';
import TrustBadges from '@/components/home/TrustBadges';
import SafetySection from '@/components/home/SafetySection';

export const metadata: Metadata = {
  title: 'Battery HUB - Batteries, Chargers, Power Supplies & Adapters',
  description:
    'Battery HUB helps students, robotics builders, IoT developers, and electronics hobbyists choose batteries, chargers, adapters, and power supplies in Islamabad and Rawalpindi.',
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <Categories />
      <ProductSections />
      <CalculatorSection />
      <TrustBadges />
      <SafetySection />
    </>
  );
}
