import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { createWhatsAppLink } from '@/config/store';

export default function CustomPackSection() {
  return (
    <section className="bg-white py-12 lg:py-16">
      <div className="container-custom">
        <div className="grid gap-8 rounded-lg bg-slate-950 p-6 text-white md:grid-cols-[1.1fr,0.9fr] md:p-8 lg:p-10">
          <div>
            <MessageCircle className="mb-5 h-10 w-10 text-emerald-400" />
            <h2 className="text-3xl font-black tracking-tight">Need Help Choosing the Right Battery?</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Share your voltage, current, backup time, and project details with us on WhatsApp. We
              will guide you about suitable battery capacity, charger rating, and power supply
              options.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a
                href={createWhatsAppLink('Assalam o Alaikum, I need help choosing the right battery or power product.')}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-400"
              >
                Ask on WhatsApp
              </a>
              <Link
                href="/calculator"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 px-5 py-3 text-sm font-black text-white transition hover:border-blue-300 hover:bg-white/10"
              >
                Use Calculator
              </Link>
            </div>
          </div>

          <div className="grid gap-3">
            {['Required voltage', 'Load current', 'Backup time', 'Connector type', 'Device or project details'].map(
              (item) => (
                <div key={item} className="rounded-lg bg-white/5 p-4 text-sm font-semibold text-slate-200">
                  {item}
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
