/**
 * Inline parsing-progress queue used on the homepage hero and /upload.
 * Shows one row per file with a live progress bar, then a completion
 * banner with a "Review" button that hands control back to the caller.
 */
import { FileText, X, ArrowRight, Check, AlertTriangle, ShieldCheck } from "lucide-react";
import { useStatementStore } from "@/lib/statement-store";
import { cn } from "@/lib/utils";

export function ParseQueue({
  onReview,
  onRemove,
}: {
  onReview: () => void;
  onRemove?: (index: number) => void;
}) {
  const pendingFiles = useStatementStore((s) => s.pendingFiles);
  const phase = useStatementStore((s) => s.phase);
  const currentFileIndex = useStatementStore((s) => s.currentFileIndex);
  const currentPage = useStatementStore((s) => s.currentPage);
  const totalPages = useStatementStore((s) => s.totalPagesAcrossFiles);
  const statements = useStatementStore((s) => s.statements);
  const errorMessage = useStatementStore((s) => s.errorMessage);

  const totalTx = statements.reduce((n, s) => n + s.transactions.length, 0);

  return (
    <div className="space-y-3 p-3 text-left">
      <div className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Queue
      </div>

      <ul className="space-y-2">
        {pendingFiles.map((f, i) => {
          const isDone =
            phase === "done" || i < currentFileIndex || (phase === "error" && i < currentFileIndex);
          const isActive = !isDone && phase === "processing" && i === currentFileIndex;
          const pct = isDone
            ? 100
            : isActive && totalPages > 0
              ? Math.min(100, Math.round((currentPage / totalPages) * 100))
              : 0;
          const pagesLabel = isDone
            ? `${statements[i]?.pageCount ?? totalPages ?? "—"} pages parsed`
            : isActive
              ? `Reading page ${currentPage}${totalPages ? ` of ${totalPages}` : ""}`
              : "Queued";

          return (
            <li
              key={i}
              className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-soft text-emerald">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-ink">{f.name}</div>
                </div>
                {isDone ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald/40 bg-emerald-soft px-2 py-0.5 text-xs font-semibold text-emerald">
                    <Check className="h-3 w-3" /> Done
                  </span>
                ) : isActive ? (
                  <span className="font-mono text-xs text-emerald">{pct}%</span>
                ) : onRemove ? (
                  <button
                    onClick={() => onRemove(i)}
                    aria-label="Remove"
                    className="text-muted-foreground hover:text-ink"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground">Queued</span>
                )}
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className={cn(
                    "h-full rounded-full bg-emerald transition-[width] duration-300",
                    isActive && "animate-pulse"
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-1.5 text-[11px] text-muted-foreground">{pagesLabel}</div>
            </li>
          );
        })}
      </ul>

      {phase === "processing" && (
        <div className="flex items-center justify-between px-2 text-[11px] text-muted-foreground">
          <span>
            File {Math.min(currentFileIndex + 1, pendingFiles.length)} / {pendingFiles.length}
          </span>
          <span className="inline-flex items-center gap-1 text-emerald">
            <ShieldCheck className="h-3 w-3" /> Zero network activity
          </span>
        </div>
      )}

      {phase === "done" && (
        <div className="flex items-center justify-between rounded-xl border border-emerald/30 bg-emerald-soft/50 px-5 py-4">
          <div>
            <div className="text-sm font-semibold text-ink">Parsing complete</div>
            <div className="text-xs text-emerald">
              {totalTx} transaction{totalTx === 1 ? "" : "s"} · ready to review
            </div>
          </div>
          <button
            onClick={onReview}
            className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-background transition hover:bg-ink/90"
          >
            Review <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {phase === "error" && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 px-5 py-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="text-sm text-ink">
            <div className="font-semibold">Conversion failed</div>
            <div className="text-xs text-muted-foreground">{errorMessage}</div>
          </div>
        </div>
      )}
    </div>
  );
}
