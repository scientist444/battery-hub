import { BadgeCheck, Headphones, MessageCircle, ShieldCheck, UsersRound, Zap } from 'lucide-react';

const badges = [
  { label: 'WhatsApp Order Support', icon: MessageCircle, color: 'text-emerald-600 bg-emerald-50' },
  { label: 'Project Guidance', icon: Headphones, color: 'text-blue-600 bg-blue-50' },
  { label: 'Battery Safety Advice', icon: ShieldCheck, color: 'text-amber-600 bg-amber-50' },
  { label: 'Student-Friendly', icon: UsersRound, color: 'text-violet-600 bg-violet-50' },
  { label: 'Clear Product Specs', icon: BadgeCheck, color: 'text-rose-600 bg-rose-50' },
  { label: 'Fast WhatsApp Response', icon: Zap, color: 'text-orange-600 bg-orange-50' },
];

export default function TrustBadges() {
  return (
    <section className="border-y border-slate-100 bg-white py-10">
      <div className="container-custom">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {badges.map(({ label, icon: Icon, color }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-3 rounded-xl border border-slate-100 p-4 text-center"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold leading-4 text-slate-700">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
