import { MessageCircle, ShieldCheck, Truck, Wallet } from 'lucide-react';

const props = [
  { icon: Truck, title: 'Bykea delivery', text: 'Across Islamabad & Rawalpindi' },
  { icon: Wallet, title: 'Easy payment', text: 'Pay via SadaPay' },
  { icon: MessageCircle, title: 'WhatsApp support', text: 'Help choosing the right part' },
  { icon: ShieldCheck, title: 'Clear specs', text: 'Voltage, current & connector listed' },
];

export function ValueProps() {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="container-custom grid grid-cols-2 gap-x-4 gap-y-5 py-6 lg:grid-cols-4">
        {props.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-center gap-3">
            <Icon className="h-6 w-6 shrink-0 text-slate-950" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-semibold text-slate-950">{title}</p>
              <p className="text-xs text-slate-500">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
