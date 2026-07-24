import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Minus, Zap, CreditCard } from "lucide-react";
import { AccountShell } from "@/components/account-shell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/account/billing")({
  head: () => ({
    meta: [
      { title: "Billing & subscription — LedgerLocal" },
      { name: "description", content: "Manage your LedgerLocal subscription, page usage, and upgrade to Pro for unlimited pages." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BillingPage,
});

const FEATURES = [
  { label: "Pages per month", free: "30 pages", pro: "Unlimited" },
  { label: "Excel (.xlsx) export", free: true, pro: true },
  { label: "CSV export", free: true, pro: true },
  { label: "OFX / QIF / QBO", free: false, pro: true },
  { label: "Tally XML export", free: false, pro: true },
  { label: "Side-by-side review", free: true, pro: true },
  { label: "Conversion history", free: true, pro: true },
  { label: "Priority support", free: false, pro: true },
] as const;

function Cell({ v }: { v: string | boolean }) {
  if (typeof v === "string") return <span className="font-mono text-sm text-ink">{v}</span>;
  return v ? (
    <Check className="mx-auto h-4 w-4 text-emerald" />
  ) : (
    <Minus className="mx-auto h-4 w-4 text-muted-foreground/50" />
  );
}

function BillingPage() {
  const [cycle, setCycle] = useState<"monthly" | "annual">("monthly");
  const used = 18;
  const cap = 30;
  const pct = Math.min(100, (used / cap) * 100);
  const monthlyPrice = 9.99;
  const price = cycle === "monthly" ? monthlyPrice : (monthlyPrice * 12 * 0.8) / 12;

  return (
    <AccountShell
      eyebrow="Account"
      title="Billing & subscription"
      subtitle="Manage your plan, usage, and payment method."
    >
      {/* Current plan + usage */}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
          <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Current plan
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="text-2xl font-bold tracking-tight text-ink">Free</div>
            <span className="rounded-full bg-surface-muted px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Free tier
            </span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            No payment method on file. Upgrade to Pro for unlimited pages and all export formats.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
          <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Usage this month
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-ink">{used}</span>
            <span className="font-mono text-sm text-muted-foreground">/ {cap} pages</span>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
            <div className="h-full rounded-full bg-emerald" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {cap - used} pages remaining · resets Dec 1
          </div>
        </div>
      </div>

      {/* Upgrade card */}
      <div className="mt-6 rounded-2xl border-2 border-emerald/40 bg-emerald/[0.03] p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xl font-bold tracking-tight text-ink">Upgrade to Pro</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Unlimited pages, all export formats, priority support.
            </p>
          </div>
          <div className="flex rounded-lg bg-surface-muted p-1">
            <button
              onClick={() => setCycle("monthly")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition",
                cycle === "monthly" ? "bg-background text-ink shadow-sm" : "text-muted-foreground",
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setCycle("annual")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition",
                cycle === "annual" ? "bg-background text-ink shadow-sm" : "text-muted-foreground",
              )}
            >
              Annual −20%
            </button>
          </div>
        </div>

        <div className="mt-5 flex items-baseline gap-1.5">
          <span className="font-mono text-4xl font-bold tracking-tight text-ink">${price.toFixed(2)}</span>
          <span className="font-mono text-sm text-muted-foreground">/ month</span>
          {cycle === "annual" ? (
            <span className="ml-2 rounded-full bg-emerald/10 px-2 py-0.5 text-xs font-semibold text-emerald">
              billed annually
            </span>
          ) : null}
        </div>

        <button className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-emerald px-6 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-emerald/90">
          <Zap className="h-4 w-4" /> Upgrade now
        </button>
      </div>

      {/* Payment method */}
      <div className="mt-6 rounded-2xl border border-border bg-background p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-muted text-muted-foreground">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-ink">Payment method</div>
              <div className="text-xs text-muted-foreground">
                No card on file. You'll be asked when you upgrade.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison table */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted/60">
            <tr>
              <th className="px-6 py-3 text-left font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Feature
              </th>
              <th className="w-28 px-6 py-3 text-center text-sm font-semibold text-ink">Free</th>
              <th className="w-28 px-6 py-3 text-center text-sm font-semibold text-emerald">Pro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {FEATURES.map((f) => (
              <tr key={f.label}>
                <td className="px-6 py-3 text-ink">{f.label}</td>
                <td className="px-6 py-3 text-center"><Cell v={f.free} /></td>
                <td className="px-6 py-3 text-center"><Cell v={f.pro} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AccountShell>
  );
}
