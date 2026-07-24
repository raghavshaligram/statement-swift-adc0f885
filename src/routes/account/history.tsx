import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Upload, ShieldCheck, Calendar } from "lucide-react";
import { AccountShell } from "@/components/account-shell";

export const Route = createFileRoute("/account/history")({
  head: () => ({
    meta: [
      { title: "Conversion history — LedgerLocal" },
      { name: "description", content: "Every statement you've converted with LedgerLocal — metadata only, files never leave your device." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HistoryPage,
});

type Row = {
  file: string;
  bank: string;
  date: string;
  txns: number;
  pages: number;
  format: "XLSX" | "CSV" | "OFX" | "QIF" | "QBO" | "Tally";
};

const ROWS: Row[] = [
  { file: "chase_dec_2024.pdf", bank: "Chase", date: "Dec 15, 2024", txns: 47, pages: 3, format: "XLSX" },
  { file: "wellsfargo_nov_2024.pdf", bank: "Wells Fargo", date: "Nov 28, 2024", txns: 32, pages: 2, format: "CSV" },
  { file: "barclays_oct_2024.pdf", bank: "Barclays", date: "Oct 31, 2024", txns: 61, pages: 4, format: "XLSX" },
  { file: "rbc_sep_2024.pdf", bank: "RBC Royal Bank", date: "Sep 30, 2024", txns: 29, pages: 2, format: "CSV" },
  { file: "bofa_aug_2024.pdf", bank: "Bank of America", date: "Aug 31, 2024", txns: 55, pages: 3, format: "OFX" },
];

const FORMAT_COLORS: Record<Row["format"], string> = {
  XLSX: "bg-emerald/10 text-emerald ring-emerald/20",
  CSV: "bg-sky-500/10 text-sky-600 ring-sky-500/20",
  OFX: "bg-amber-500/10 text-amber-700 ring-amber-500/20",
  QIF: "bg-violet-500/10 text-violet-600 ring-violet-500/20",
  QBO: "bg-rose-500/10 text-rose-600 ring-rose-500/20",
  Tally: "bg-orange-500/10 text-orange-600 ring-orange-500/20",
};

function HistoryPage() {
  return (
    <AccountShell eyebrow="Account" title="Conversion history" subtitle={`${ROWS.length} conversions on record`}>
      <div className="mb-4 flex justify-end">
        <Link
          to="/upload"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-emerald/90"
        >
          <Upload className="h-4 w-4" /> New conversion
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted/60">
            <tr className="text-left font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3">File</th>
              <th className="px-5 py-3">Bank detected</th>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Transactions</th>
              <th className="px-5 py-3">Pages</th>
              <th className="px-5 py-3">Format</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ROWS.map((r) => (
              <tr key={r.file} className="transition hover:bg-surface-muted/30">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-muted text-muted-foreground">
                      <FileText className="h-4 w-4" />
                    </div>
                    <span className="font-mono text-[13px] text-ink">{r.file}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-ink">{r.bank}</td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {r.date}
                  </span>
                </td>
                <td className="px-5 py-4 font-mono text-ink">{r.txns}</td>
                <td className="px-5 py-4 font-mono text-muted-foreground">{r.pages} pp.</td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold ring-1 ${FORMAT_COLORS[r.format]}`}
                  >
                    {r.format}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-5 flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald" />
        History metadata is stored on our servers. The original PDF files are never uploaded — only row counts and export format.
      </p>
    </AccountShell>
  );
}
