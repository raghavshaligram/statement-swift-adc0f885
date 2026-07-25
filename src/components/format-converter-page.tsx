/**
 * Shared template for the format-conversion landing pages (CSV<->IIF,
 * CSV<->QIF, CSV<->OFX, CSV<->QFX, MT940->CSV). Deliberately factored out
 * into one component rather than duplicating this structure across 9
 * near-identical route files -- the same "one source of truth" reasoning
 * behind every other shared module this session (upload-validation.ts,
 * use-page-usage.ts, etc.), so a structural fix or design tweak doesn't
 * need to be repeated 9 times and risk drifting.
 *
 * Each route file owns its own real content (title, steps, FAQ) -- this
 * component only owns the shared visual structure and the FAQPage JSON-LD
 * generation.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";

export type FormatConverterFaqItem = { q: string; a: string };

export function FormatConverterPage({
  title,
  intro,
  steps,
  ctaLabel,
  faq,
  freeNote,
}: {
  title: string;
  intro: string;
  steps: string[];
  ctaLabel: string;
  faq: FormatConverterFaqItem[];
  /** Most of these formats are free/unlimited (structured-text parsing, not OCR) -- stated explicitly per page since it's not the default assumption a visitor would make. */
  freeNote: string;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="border-b border-border py-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h1>
          <p className="mt-4 text-muted-foreground">{intro}</p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface-muted px-4 py-2 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald" />
            {freeNote}
          </div>
        </div>
      </section>

      <section className="border-b border-border py-16">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-2xl font-bold tracking-tight text-ink">How it works</h2>
          <ol className="mt-5 space-y-3 text-sm text-ink">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-soft font-mono text-xs font-semibold text-emerald">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <div className="mt-8 text-center">
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 rounded-md bg-ink px-6 py-3 text-sm font-semibold text-background transition hover:bg-ink/90"
            >
              {ctaLabel} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-2xl font-bold tracking-tight text-ink text-center">Frequently asked questions</h2>
          <div className="mt-8 space-y-4">
            {faq.map(({ q, a }) => (
              <div key={q} className="rounded-lg border border-border bg-card p-5">
                <div className="font-semibold text-ink">{q}</div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
