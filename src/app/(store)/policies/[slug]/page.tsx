import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { POLICIES, POLICIES_UPDATED, getPolicy } from '@/config/policies';
import { createWhatsAppLink } from '@/config/store';

export function generateStaticParams() {
  return POLICIES.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const policy = getPolicy(params.slug);
  return policy ? { title: policy.title, description: policy.summary } : {};
}

export default function PolicyPage({ params }: { params: { slug: string } }) {
  const policy = getPolicy(params.slug);
  if (!policy) notFound();

  return (
    <div className="bg-slate-50 py-12 lg:py-16">
      <div className="container-custom grid gap-8 lg:grid-cols-[220px,1fr]">
        <nav className="order-2 lg:order-1">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Policies</p>
          <ul className="mt-3 space-y-1">
            {POLICIES.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/policies/${p.slug}`}
                  className={
                    p.slug === policy.slug
                      ? 'block rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-950 shadow-sm'
                      : 'block rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-white hover:text-slate-950'
                  }
                >
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <article className="order-1 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:p-8 lg:order-2">
          <h1 className="text-3xl font-black tracking-tight text-slate-950">{policy.title}</h1>
          <p className="mt-2 text-sm text-slate-600">{policy.summary}</p>
          <p className="mt-1 text-xs text-slate-400">Last updated {POLICIES_UPDATED}</p>

          <div className="mt-8 space-y-7">
            {policy.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-lg font-bold text-slate-950">{section.heading}</h2>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-slate-700">
                  {section.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <a
            href={createWhatsAppLink(`Assalam o Alaikum, I have a question about your ${policy.title.toLowerCase()}.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700"
          >
            <MessageCircle className="h-4 w-4" /> Questions? Ask on WhatsApp
          </a>
        </article>
      </div>
    </div>
  );
}
