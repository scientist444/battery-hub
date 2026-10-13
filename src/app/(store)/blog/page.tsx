import { ShieldAlert } from 'lucide-react';

const notes = [
  'Use compatible chargers only.',
  'Do not short-circuit batteries.',
  'Confirm voltage and connector before ordering.',
  'Do not overcharge or over-discharge batteries.',
  'For high-current projects, confirm peak current before selecting a battery.',
  'Use proper protection circuits where required.',
];

export default function BatterySafetyGuidePage() {
  return (
    <div className="bg-slate-50 py-12 lg:py-16">
      <div className="container-custom">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 md:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950">Battery Safety Guide</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-amber-900">
            These notes are general safety reminders for batteries, chargers, power supplies, and
            adapters. Ask on WhatsApp before ordering if you are unsure about compatibility.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((note) => (
              <div key={note} className="rounded-lg bg-white p-4 text-sm font-bold leading-6 text-slate-800">
                {note}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
