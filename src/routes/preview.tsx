import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Download, Check, X, AlertCircle, AlertTriangle, TableProperties, FileText, ArrowUpDown, MoreHorizontal } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { SideBySidePane } from "@/components/side-by-side-pane";
import { useStatementStore } from "@/lib/statement-store";
import { formatAmount } from "@/lib/pdf/detect-currency";
import { getConfidenceTier } from "@/lib/pdf/confidence";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/lib/statement-store";

export const Route = createFileRoute("/preview")({
  head: () => ({
    meta: [
      { title: "Preview & edit · LedgerLocal" },
      { name: "description", content: "Review extracted transactions before export." },
      { property: "og:title", content: "Preview & edit · LedgerLocal" },
      { property: "og:description", content: "Editable transaction table with inline correction." },
    ],
  }),
  component: PreviewPage,
});

type FilterTab = "all" | "credits" | "debits" | "flagged";

function PreviewPage() {
  const nav = useNavigate();
  const statements = useStatementStore((s) => s.statements);
  const updateTransaction = useStatementStore((s) => s.updateTransaction);
  const deleteTransaction = useStatementStore((s) => s.deleteTransaction);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<FilterTab>("all");
  const [view, setView] = useState<"table" | "sidebyside">("table");
  const [editing, setEditing] = useState<{ id: string; field: keyof Transaction } | null>(null);

  const rows = useMemo(() => statements.flatMap((st) => st.transactions), [statements]);
  const warnings = useMemo(() => statements.flatMap((st) => st.warnings), [statements]);
  const currency = useMemo(() => statements.find((st) => st.currency)?.currency ?? null, [statements]);
  const flaggedCount = rows.filter((r) => getConfidenceTier(r.confidence) === "low").length;

  // No parsed statements in the store (e.g. direct nav, or a page refresh which
  // clears in-memory state) — send back to upload rather than show an empty table.
  useEffect(() => {
    if (statements.length === 0) nav({ to: "/upload" });
  }, [statements.length, nav]);

  const filtered = useMemo(
    () =>
      rows
        .filter((r) => r.description.toLowerCase().includes(q.toLowerCase()))
        .filter((r) => {
          if (tab === "credits") return r.amount > 0;
          if (tab === "debits") return r.amount < 0;
          if (tab === "flagged") return getConfidenceTier(r.confidence) === "low";
          return true;
        }),
    [rows, q, tab]
  );

  const credits = rows.reduce((s, r) => s + (r.amount > 0 ? r.amount : 0), 0);
  const debits = rows.reduce((s, r) => s + (r.amount < 0 ? -r.amount : 0), 0);
  const lastWithBalance = [...rows].reverse().find((r) => r.balance !== null);

  function update(t: Transaction, field: keyof Transaction, value: string) {
    const patch: Partial<Transaction> =
      field === "amount" || field === "balance" ? { [field]: parseFloat(value) || 0 } : { [field]: value };
    updateTransaction(t.sourceFile, t.id, patch);
  }

  if (statements.length === 0) return null;

  return (
    <AppShell>
      <div className="space-y-4">


        {/* Dark stat strip -- transaction totals + the primary Export action,
            replacing the old light summary cards + separate bottom bar. */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-ink px-5 py-4 text-background">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
            <StatItem label="Transactions" value={rows.length.toString()} />
            <StatItem label="Credits" value={formatAmount(credits, currency)} tone="pos" />
            <StatItem label="Debits" value={formatAmount(debits, currency)} tone="neg" />
            <StatItem
              label="Closing bal."
              value={lastWithBalance ? formatAmount(lastWithBalance.balance!, currency) : "—"}
            />
            <StatItem label="Flagged" value={flaggedCount.toString()} tone={flaggedCount > 0 ? "warn" : undefined} />
          </div>
          <Link
            to="/export"
            className="inline-flex items-center gap-2 rounded-md bg-emerald px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-emerald/90"
          >
            <Download className="h-4 w-4" /> Export
          </Link>
        </div>

        {/* Shared toolbar: view toggle + search + filters + row count */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-0.5 rounded-lg border border-border bg-card p-1">
              {(
                [
                  ["table", "Table", TableProperties],
                  ["sidebyside", "Side-by-side", FileText],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                    view === id ? "bg-surface-muted text-ink" : "text-muted-foreground hover:text-ink"
                  )}
                >
                  <Icon className="h-3 w-3" /> {label}
                </button>
              ))}
            </div>
            <div className="relative w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald"
              />
            </div>
            <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1">
              {(
                [
                  ["all", "All"],
                  ["credits", "Credits"],
                  ["debits", "Debits"],
                  ["flagged", "Flagged"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-semibold transition",
                    tab === key
                      ? "bg-emerald text-primary-foreground"
                      : "text-muted-foreground hover:text-ink"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            <span className="font-mono">{filtered.length}</span> rows · dbl-click to edit
          </div>
        </div>

        {warnings.length > 0 && (
          <div className="flex items-start gap-2 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{warnings.join(" · ")}</span>
          </div>
        )}


        {view === "table" ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border bg-surface-muted/60 text-left text-sm font-semibold text-muted-foreground">
                <th className="w-10 px-3 py-3"><input type="checkbox" /></th>
                <th className="px-3 py-3"><span className="inline-flex items-center gap-1">Date <ArrowUpDown className="h-3 w-3 opacity-50" /></span></th>
                <th className="px-3 py-3"><span className="inline-flex items-center gap-1">Description <ArrowUpDown className="h-3 w-3 opacity-50" /></span></th>
                <th className="px-3 py-3 text-right"><span className="inline-flex items-center gap-1">Debit <ArrowUpDown className="h-3 w-3 opacity-50" /></span></th>
                <th className="px-3 py-3 text-right"><span className="inline-flex items-center gap-1">Credit <ArrowUpDown className="h-3 w-3 opacity-50" /></span></th>
                <th className="px-3 py-3 text-right"><span className="inline-flex items-center gap-1">Balance <ArrowUpDown className="h-3 w-3 opacity-50" /></span></th>
                <th className="px-3 py-3 text-right"><span className="inline-flex items-center gap-1">Conf. <ArrowUpDown className="h-3 w-3 opacity-50" /></span></th>
                <th className="w-10 px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r) => {
                const flagged = getConfidenceTier(r.confidence) === "low";
                const debit = r.amount < 0 ? -r.amount : null;
                const credit = r.amount > 0 ? r.amount : null;
                return (
                  <tr
                    key={r.id}
                    className={cn(
                      "group hover:bg-surface-muted/50",
                      flagged && "border-l-2 border-l-amber-500 bg-amber-50/40"
                    )}
                  >
                    <td className="px-3 py-2">
                      <input type="checkbox" />
                    </td>
                    <td className="px-3 py-2">
                      <EditableCell
                        value={r.date}
                        editing={editing?.id === r.id && editing.field === "date"}
                        onEdit={() => setEditing({ id: r.id, field: "date" })}
                        onCommit={(v) => { update(r, "date", v); setEditing(null); }}
                        className="font-mono text-xs text-ink"
                      />
                    </td>
                    <td className="max-w-[520px] px-3 py-2">
                      <div className="flex items-center gap-2">
                        {flagged && (
                          <span title="Low confidence — please verify">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                          </span>
                        )}
                        <EditableCell
                          value={r.description}
                          editing={editing?.id === r.id && editing.field === "description"}
                          onEdit={() => setEditing({ id: r.id, field: "description" })}
                          onCommit={(v) => { update(r, "description", v); setEditing(null); }}
                          className="block max-w-full truncate whitespace-nowrap text-ink"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-destructive">
                      {debit !== null ? formatAmount(debit, currency) : <span className="text-muted-foreground/50">–</span>}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-emerald">
                      {credit !== null ? formatAmount(credit, currency) : <span className="text-muted-foreground/50">–</span>}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-ink/80">
                      {r.balance !== null ? formatAmount(r.balance, currency) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <ConfidenceBadge score={r.confidence} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => deleteTransaction(r.sourceFile, r.id)}
                        className="opacity-0 transition group-hover:opacity-100"
                        aria-label="Row actions"
                      >
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground hover:text-ink" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        ) : (
        <div className="rounded-xl bg-surface-muted/40 p-4">
          <SideBySidePane
            transactions={rows}
            currency={currency}
            headerLine={statements[0] ? `${statements[0].detectedBank ?? "Statement"} — ${statements[0].fileName}` : undefined}
          />
          <p className="mt-3 text-center font-mono text-[10px] text-muted-foreground">
            Showing all {rows.length} parsed transactions · hover either panel to sync-highlight · switch to Table view to edit
          </p>
        </div>
        )}

        {/* Confidence-key legend footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-2 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono uppercase tracking-wider text-muted-foreground">confidence</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald/30 bg-emerald-soft px-2 py-0.5 font-mono text-[10px] font-semibold text-accent-foreground">
              ≥90% high
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-700">
              75-89% medium
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-destructive">
              &lt;75% low
            </span>
          </div>
          <span className="font-mono text-muted-foreground">
            {view === "table" ? "double-click any cell to edit" : "side-by-side — read-only · switch to Table to edit"}
          </span>
        </div>

      </div>
    </AppShell>
  );
}

function StatItem({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" | "warn" }) {
  return (
    <div>
      <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-background/50">
        {label}
      </div>
      <div
        className={cn(
          "mt-0.5 font-mono text-lg font-semibold tabular-nums",
          tone === "pos" && "text-emerald",
          tone === "neg" && "text-destructive",
          tone === "warn" && "text-amber-400",
          !tone && "text-background"
        )}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * Real weighted confidence score (see parse-transactions.ts), bucketed into
 * the same three tiers shown in the confidence-key legend below the table:
 * >=90% high (green), 75-89% medium (amber), <75% low (red).
 */
function ConfidenceBadge({ score }: { score: number }) {
  const tier = getConfidenceTier(score);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold",
        tier === "high" && "border-emerald/30 bg-emerald-soft text-accent-foreground",
        tier === "medium" && "border-amber-400/40 bg-amber-50 text-amber-700",
        tier === "low" && "border-destructive/30 bg-destructive/10 text-destructive"
      )}
    >
      {tier === "low" ? <X className="h-2.5 w-2.5" /> : <Check className="h-2.5 w-2.5" />}
      {score}%
    </span>
  );
}

function EditableCell({
  value, editing, onEdit, onCommit, className,
}: {
  value: string; editing: boolean; onEdit: () => void; onCommit: (v: string) => void; className?: string;
}) {
  if (editing) {
    return (
      <input
        autoFocus
        defaultValue={value}
        onBlur={(e) => onCommit(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onCommit((e.target as HTMLInputElement).value)}
        className={`w-full rounded border border-emerald bg-background px-1.5 py-0.5 outline-none ${className ?? ""}`}
      />
    );
  }
  return (
    <span onClick={onEdit} className={`cursor-text rounded px-1.5 py-0.5 hover:bg-surface-muted ${className ?? ""}`}>
      {value}
    </span>
  );
}
