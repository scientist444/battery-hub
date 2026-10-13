import Link from 'next/link';
import { ArrowRight, BatteryCharging, Calculator } from 'lucide-react';

const promos = [
  {
    href: '/custom-battery',
    icon: BatteryCharging,
    eyebrow: 'Made to order',
    title: 'Custom battery packs',
    text: 'Tell us the voltage, capacity and connector. We build it with the right BMS.',
    className: 'bg-emerald-50 text-emerald-950',
  },
  {
    href: '/calculator',
    icon: Calculator,
    eyebrow: 'Free tool',
    title: 'Battery size calculator',
    text: 'Work out the mAh you need from your load current and backup time.',
    className: 'bg-blue-50 text-blue-950',
  },
];

export function PromoBanners() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {promos.map(({ href, icon: Icon, eyebrow, title, text, className }) => (
        <Link key={href} href={href} className={`group flex items-start gap-5 rounded-xl p-6 transition hover:shadow-md sm:p-8 ${className}`}>
          <Icon className="h-10 w-10 shrink-0" strokeWidth={1.5} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{eyebrow}</p>
            <h3 className="mt-1 text-xl font-bold">{title}</h3>
            <p className="mt-2 text-sm leading-6 opacity-80">{text}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 group-hover:underline">
              Learn more <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
