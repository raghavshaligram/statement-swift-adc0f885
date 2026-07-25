import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "Does NatWest let me export a CSV statement directly?",
    a: "Yes. In NatWest Online Banking, go to Statements & transactions, then View transactions, set your date range, and export to CSV, Excel, or PDF directly — no third-party tool needed. That's the fastest route if you can log in and the account is still open.",
  },
  {
    q: "So when do I actually need a converter?",
    a: "When you only have a PDF and can't (or don't want to) re-export from online banking — an old statement someone emailed you, a closed account, or a paper statement you scanned. LedgerLocal reads the PDF directly and gives you CSV, Excel, or other formats from that.",
  },
  {
    q: "Can I combine NatWest statements with other banks?",
    a: "Yes. Drop PDFs from NatWest and any other bank into the same batch — LedgerLocal detects each one and processes them together into one export.",
  },
  {
    q: "Does this work for NatWest business accounts, not just personal?",
    a: "NatWest is named-detected specifically for the standard personal statement layout. Business account statements often use a different layout, so they'll likely fall back to the generic parser — it works with any text-based PDF, but double-check the extracted rows before exporting, same as with any statement the generic parser handles.",
  },
  {
    q: "Is my NatWest statement data safe?",
    a: "Nothing is uploaded, ever. The PDF is read and converted entirely on your device — you can confirm this yourself by opening your browser's DevTools Network tab during a conversion and watching for outbound requests. There won't be any.",
  },
];

export const Route = createFileRoute("/natwest-bank-statement-to-csv")({
  head: () => ({
    meta: [
      { title: "NatWest Bank Statement to CSV — LedgerLocal" },
      {
        name: "description",
        content:
          "NatWest lets you export CSV directly from online banking. If you only have a PDF statement, convert it to CSV or Excel on-device with LedgerLocal — free to try, nothing uploaded.",
      },
      { property: "og:title", content: "NatWest Bank Statement to CSV — LedgerLocal" },
      {
        property: "og:description",
        content: "NatWest's own CSV export, plus a free converter for when you only have a PDF.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(({ q, a }) => ({
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
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            NatWest bank statement to CSV
          </h1>
          <p className="mt-4 text-muted-foreground">
            The fastest route depends on what you actually have: access to your NatWest account, or just a PDF.
            Here's both.
          </p>
        </div>
      </section>

      <section className="border-b border-border py-16">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-2xl font-bold tracking-tight text-ink">
            Option 1: Export directly from NatWest (fastest, if you can log in)
          </h2>
          <p className="mt-3 text-muted-foreground">
            NatWest's own online banking already exports to CSV — no converter needed:
          </p>
          <ol className="mt-5 space-y-3 text-sm text-ink">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-soft font-mono text-xs font-semibold text-emerald">1</span>
              Log in at{" "}
              <span className="font-mono">onlinebanking.natwest.com</span>, or the NatWest mobile app.
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-soft font-mono text-xs font-semibold text-emerald">2</span>
              Select <span className="font-semibold">Statements &amp; transactions</span>, then{" "}
              <span className="font-semibold">View transactions</span>.
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-soft font-mono text-xs font-semibold text-emerald">3</span>
              Set your date range, then choose <span className="font-semibold">CSV</span> (or Excel/PDF) from the
              export options.
            </li>
          </ol>
          <p className="mt-4 text-sm text-muted-foreground">
            NatWest gives you up to 7 years of history this way. If this works for you, you're done — you don't
            need anything else on this page.
          </p>
        </div>
      </section>

      <section className="border-b border-border py-16">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-2xl font-bold tracking-tight text-ink">
            Option 2: Convert a PDF statement (when Option 1 isn't available)
          </h2>
          <p className="mt-3 text-muted-foreground">
            This is the real gap Option 1 doesn't cover — a statement you already have as a PDF (emailed to you, a
            closed account, mail you scanned) rather than something you can freshly export. LedgerLocal reads the
            PDF and converts it directly on your device:
          </p>
          <ol className="mt-5 space-y-3 text-sm text-ink">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-soft font-mono text-xs font-semibold text-emerald">1</span>
              Drop your NatWest PDF statement into the converter — no account needed for up to 6 pages.
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-soft font-mono text-xs font-semibold text-emerald">2</span>
              LedgerLocal detects NatWest's layout automatically and extracts every transaction with a confidence
              score, so you can see what's certain and what's worth double-checking.
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-soft font-mono text-xs font-semibold text-emerald">3</span>
              Export to CSV, Excel, or — if you need a format NatWest doesn't offer natively, like Tally XML or
              QuickBooks Desktop's IIF — those too.
            </li>
          </ol>
          <div className="mt-8 flex items-center justify-center gap-2 rounded-full border border-border bg-surface-muted px-4 py-2 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald" />
            Processed on your device — nothing uploaded, ever
          </div>
          <div className="mt-6 text-center">
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 rounded-md bg-ink px-6 py-3 text-sm font-semibold text-background transition hover:bg-ink/90"
            >
              Convert a NatWest statement <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-2xl font-bold tracking-tight text-ink text-center">Frequently asked questions</h2>
          <div className="mt-8 space-y-4">
            {FAQ.map(({ q, a }) => (
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
