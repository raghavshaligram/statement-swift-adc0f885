import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Lock, ServerOff, FileText, Mail } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — LedgerLocal" },
      {
        name: "description",
        content:
          "LedgerLocal processes PDF bank statements on your device. Learn what data we collect, how it is used, and how your financial documents stay private.",
      },
      { property: "og:title", content: "Privacy Policy — LedgerLocal" },
      {
        property: "og:description",
        content:
          "Your bank statements never leave your device. Read LedgerLocal's privacy practices.",
      },
    ],
  }),
  component: Privacy,
});

const sections = [
  {
    icon: ServerOff,
    title: "On-device processing",
    body: "LedgerLocal is designed so your PDF bank statements are parsed entirely inside your browser or local application. No statement content, transaction history, or account numbers are uploaded to our servers. The file never leaves your device unless you choose to save or export the output yourself.",
  },
  {
    icon: Shield,
    title: "What we collect",
    body: "If you use the free tier, we do not require an account and collect no statement data. If you create an account for Pro access, we collect your email address, authentication provider details, and billing information handled by our payment processor. We also collect basic product analytics (feature usage, errors, and device type) to improve the software.",
  },
  {
    icon: Lock,
    title: "How we use your information",
    body: "Account information is used to authenticate you, manage your Pro subscription, and send essential service updates. Analytics data is used to fix bugs, improve parsing accuracy, and prioritize new export formats. We do not sell, rent, or trade your personal information.",
  },
  {
    icon: FileText,
    title: "Cookies and local storage",
    body: "We use a small number of cookies and browser storage items to keep you signed in and remember your preferences. You can clear these at any time through your browser settings. We do not use third-party advertising or tracking cookies.",
  },
  {
    icon: Mail,
    title: "Your rights and contact",
    body: "You may request access to, correction of, or deletion of your account data by contacting us. Because statement content is processed locally, we generally cannot access, delete, or retain copies of your bank statements.",
  },
];

function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="border-b border-border py-16">
        <div className="mx-auto max-w-3xl px-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald">
            Privacy
          </div>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Your bank statements are processed on your device, not on our servers. This page explains what we do and do not collect.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: July 23, 2026
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-3xl px-6">
          <div className="space-y-12">
            {sections.map((s) => (
              <div key={s.title} className="flex gap-5">
                <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald/10 text-emerald sm:flex">
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-ink">{s.title}</h2>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 rounded-2xl border border-border bg-surface-muted/40 p-8">
            <h2 className="text-xl font-semibold text-ink">Questions?</h2>
            <p className="mt-2 text-muted-foreground">
              If you have any questions about this Privacy Policy or your data, please contact us at{" "}
              <a href="mailto:privacy@ledgerlocal.app" className="text-emerald hover:underline">
                privacy@ledgerlocal.app
              </a>
              .
            </p>
            <div className="mt-6">
              <Link
                to="/"
                className="inline-flex items-center rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-background transition hover:bg-ink/90"
              >
                Back to home
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
