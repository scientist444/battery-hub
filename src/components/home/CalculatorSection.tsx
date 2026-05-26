import Link from 'next/link';
import { ArrowRight, Calculator } from 'lucide-react';

export default function CalculatorSection() {
  return (
    <section className="bg-white py-12 lg:py-16">
      <div className="container-custom">
        <div className="grid gap-8 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-8 shadow-lg md:grid-cols-[1fr,0.75fr] md:p-10">
          <div>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 text-white">
              <Calculator className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Not Sure Which Battery You Need?
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-6 text-blue-100">
              Use the battery calculator to estimate the required capacity based on your load
              current and desired backup time.
            </p>
            <Link
              href="/calculator"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
            >
              Use Calculator
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="flex items-center">
            <div className="w-full rounded-xl bg-white/10 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-200">
                Quick Formula
              </p>
              <p className="mt-3 text-2xl font-bold text-white">Ah = A × h × 1.25</p>
              <p className="mt-3 text-xs leading-5 text-blue-200">
                Ampere-hours = Load current × backup hours × 1.25 safety factor.
                Final selection should consider peak current, connector type, and charger rating.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
