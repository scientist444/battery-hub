import Link from 'next/link';
import type { ElementType } from 'react';
import { ArrowRight, Battery, BatteryCharging, Plug, Power, ShieldCheck } from 'lucide-react';
import { products } from '@/data/products';
import { ProductCategory } from '@/types';

const categories = [
  {
    id: 'batteries',
    label: 'Batteries',
    text: 'Rechargeable cells for electronics, robotics, and project use.',
    href: '/products/batteries',
    icon: Battery,
    color: 'text-blue-700 bg-blue-50 group-hover:bg-blue-600 group-hover:text-white',
  },
  {
    id: 'chargers',
    label: 'Chargers',
    text: 'Compatible charging modules and circuits for lithium batteries.',
    href: '/products/chargers',
    icon: BatteryCharging,
    color: 'text-violet-700 bg-violet-50 group-hover:bg-violet-600 group-hover:text-white',
  },
  {
    id: 'power-supplies',
    label: 'Power Supplies',
    text: 'Stable DC power for electronics, testing, LEDs, and CCTV.',
    href: '/products/power-supplies',
    icon: Power,
    color: 'text-orange-700 bg-orange-50 group-hover:bg-orange-600 group-hover:text-white',
  },
  {
    id: 'adapters',
    label: 'Adapters',
    text: 'AC/DC adapters for routers, modules, and low-power devices.',
    href: '/products/adapters',
    icon: Plug,
    color: 'text-emerald-700 bg-emerald-50 group-hover:bg-emerald-600 group-hover:text-white',
  },
  {
    id: 'bms-boards',
    label: 'BMS Boards',
    text: 'Battery protection boards for lithium pack builds.',
    href: '/products/bms-boards',
    icon: ShieldCheck,
    color: 'text-rose-700 bg-rose-50 group-hover:bg-rose-600 group-hover:text-white',
  },
] satisfies Array<{
  id: ProductCategory;
  label: string;
  text: string;
  href: string;
  icon: ElementType;
  color: string;
}>;

export default function Categories() {
  const availableCategories = categories.filter((category) =>
    products.some((product) => product.category === category.id),
  );

  if (availableCategories.length === 0) return null;

  return (
    <section className="bg-white py-12 lg:py-16">
      <div className="container-custom">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-blue-600">
              Shop by Category
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              Everything you need for your build
            </h2>
          </div>
          <Link
            href="/products"
            className="flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:text-blue-800"
          >
            View all products
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {availableCategories.map(({ label, text, href, icon: Icon, color }) => (
            <Link
              key={label}
              href={href}
              className="group rounded-xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
            >
              <div
                className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl transition ${color}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-950 group-hover:text-blue-700">
                {label}
              </h3>
              <p className="mt-1.5 text-sm leading-5 text-slate-500">{text}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-blue-700">
                Browse <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
