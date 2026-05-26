'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Calculator, MessageCircle, ShieldAlert } from 'lucide-react';
import { createWhatsAppLink } from '@/config/store';

const chemistryOptions = ['Li-ion', 'LiPo', 'Lead Acid', 'Other / Not sure'];

export default function CalculatorPage() {
  const [voltage, setVoltage] = useState('');
  const [loadCurrent, setLoadCurrent] = useState('');
  const [backupTime, setBackupTime] = useState('');
  const [chemistry, setChemistry] = useState(chemistryOptions[0]);
  const [submitted, setSubmitted] = useState(false);

  const capacityAh = useMemo(() => {
    const current = Number(loadCurrent);
    const hours = Number(backupTime);
    if (!current || !hours) return null;
    return current * hours * 1.25;
  }, [backupTime, loadCurrent]);

  const canCalculate = Boolean(Number(voltage) && Number(loadCurrent) && Number(backupTime));

  return (
    <div className="bg-slate-50">
      <section className="bg-white py-12 lg:py-16">
        <div className="container-custom grid gap-8 lg:grid-cols-[0.9fr,1.1fr] lg:items-center">
          <div>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <Calculator className="h-6 w-6" />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-950 lg:text-5xl">
              Battery Calculator
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
              Estimate required capacity based on load current and backup time before asking on
              WhatsApp for final product guidance.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-7">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-black text-slate-800">Required voltage</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={voltage}
                  onChange={(event) => setVoltage(event.target.value)}
                  placeholder="e.g. 12"
                  className="input-field"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-black text-slate-800">Load current in amps</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={loadCurrent}
                  onChange={(event) => setLoadCurrent(event.target.value)}
                  placeholder="e.g. 2"
                  className="input-field"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-black text-slate-800">Backup time in hours</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={backupTime}
                  onChange={(event) => setBackupTime(event.target.value)}
                  placeholder="e.g. 4"
                  className="input-field"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-black text-slate-800">Battery chemistry</span>
                <select
                  value={chemistry}
                  onChange={(event) => setChemistry(event.target.value)}
                  className="input-field"
                >
                  {chemistryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              type="button"
              onClick={() => setSubmitted(true)}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700"
            >
              <Calculator className="h-4 w-4" />
              Calculate
            </button>

            {submitted && canCalculate && capacityAh !== null && (
              <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-sm font-black text-emerald-900">Estimated required capacity:</p>
                <p className="mt-2 text-3xl font-black text-slate-950">{capacityAh.toFixed(2)} Ah</p>
                <p className="mt-3 text-sm leading-6 text-emerald-900">
                  Formula: load current x backup time x 1.25
                </p>
                <a
                  href={createWhatsAppLink(
                    `Assalam o Alaikum, I used the calculator. Required voltage: ${voltage}V, load current: ${loadCurrent}A, backup time: ${backupTime} hours, chemistry: ${chemistry}, estimated capacity: ${capacityAh.toFixed(2)}Ah. Please guide me.`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-700"
                >
                  <MessageCircle className="h-4 w-4" />
                  Ask on WhatsApp
                </a>
              </div>
            )}

            {submitted && !canCalculate && (
              <div className="mt-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                <ShieldAlert className="mt-0.5 h-5 w-5" />
                Enter voltage, load current, and backup time to calculate capacity.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container-custom rounded-lg border border-amber-200 bg-amber-50 p-6 md:p-8">
          <h2 className="text-2xl font-black text-slate-950">Important Note</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-amber-900">
            This is only an estimate. Final battery selection should consider peak current, voltage,
            connector type, charger compatibility, and safety margin.
          </p>
          <Link
            href="/products"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg border border-amber-300 bg-white px-5 py-3 text-sm font-black text-slate-900 transition hover:bg-amber-100"
          >
            Browse Products
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
