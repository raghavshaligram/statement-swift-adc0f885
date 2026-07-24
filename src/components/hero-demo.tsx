/**
 * The hero's live in-browser demo (Section 1 of the homepage design brief).
 *
 * - Idle (nothing dropped yet): loops a small, clearly-labeled canned example
 *   dataset so visitors immediately see what the output looks like.
 * - Real file dropped: runs the actual client-side parsing pipeline
 *   (parseStatementFile) and reveals the real extracted rows — same store
 *   and pipeline /upload uses, so a "Continue to full preview" link can go
 *   straight to /preview with the data already loaded.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { StatementDropzone } from "@/components/statement-dropzone";
import { useStatementStore } from "@/lib/statement-store";
import { parseStatementFile } from "@/lib/pdf/parse-statement";
import { getConfidenceTier } from "@/lib/pdf/confidence";
import { getPdfPageCount } from "@/lib/pdf/extract-text";
import { ANONYMOUS_MAX_PAGES } from "@/lib/pricing-constants";

// Hardcoded, clearly-labeled example — never shown as if it were a real parse.
const EXAMPLE_ROWS = [
  { date: "04/01", description: "Payroll — Meridian Labs", amount: 3840.0 },
  { date: "04/03", description: "Green Leaf Grocers", amount: -54.1 },
  { date: "04/05", description: "Transfer — Savings", amount: -600.0 },
  { date: "04/09", description: "City Power & Light", amount: -112.44 },
  { date: "04/14", description: "Interest Payment", amount: 0.38 },
];

export function HeroDemo() {
  const phase = useStatementStore((s) => s.phase);
  const pendingFiles = useStatementStore((s) => s.pendingFiles);
  const currentFileIndex = useStatementStore((s) => s.currentFileIndex);
  const currentPage = useStatementStore((s) => s.currentPage);
  const statements = useStatementStore((s) => s.statements);
  const errorMessage = useStatementStore((s) => s.errorMessage);
  const setPendingFiles = useStatementStore((s) => s.setPendingFiles);
  const startProcessing = useStatementStore((s) => s.startProcessing);
  const setProgress = useStatementStore((s) => s.setProgress);
  const finishProcessing = useStatementStore((s) => s.finishProcessing);
  const failProcessing = useStatementStore((s) => s.failProcessing);
  const reset = useStatementStore((s) => s.reset);

  const [liveFileName, setLiveFileName] = useState("");
  const [pageLimitError, setPageLimitError] = useState<string | null>(null);

  // The homepage always starts from the idle example demo — if a visitor
  // navigates back here after converting something (e.g. via the header
  // logo), we reset the shared store rather than show a stale result.
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFiles(files: File[]) {
    setPageLimitError(null);

    // Real, instant page-count check (just PDF metadata, no text extraction)
    // before any parsing work starts -- this homepage demo previously had NO
    // enforcement at all despite the dropzone label claiming a page limit.
    const pageCounts = await Promise.all(
      files.map(async (f) => ({ file: f, pages: await getPdfPageCount(f) }))
    );
    const tooLong = pageCounts.filter((p) => p.pages > ANONYMOUS_MAX_PAGES);
    if (tooLong.length > 0) {
      setPageLimitError(
        tooLong.length === 1
          ? `${tooLong[0].file.name} is too large for the free demo. Sign up to convert larger statements.`
          : `${tooLong.map((t) => t.file.name).join(", ")} are too large for the free demo. Sign up to convert larger statements.`
      );
      return;
    }

    reset();
    setPendingFiles(files);
    startProcessing();
    const parsed = [];
    try {
      for (let i = 0; i < files.length; i++) {
        setLiveFileName(files[i].name);
        const statement = await parseStatementFile(files[i], (page, total) =>
          setProgress(i, page, total)
        );
        parsed.push(statement);
      }
      finishProcessing(parsed);
    } catch (err) {
      failProcessing(err instanceof Error ? err.message : "Something went wrong while parsing.");
    }
  }

  const allTransactions = useMemo(
    () => statements.flatMap((st) => st.transactions),
    [statements]
  );
  const flaggedCount = allTransactions.filter((t) => getConfidenceTier(t.confidence) === "low").length;
  const shown = allTransactions.slice(0, 6);
  const remaining = allTransactions.length - shown.length;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-xl shadow-slate-900/5">
      {phase === "idle" && (
        <>
          <StatementDropzone variant="compact" onFiles={handleFiles} />
          {pageLimitError ? (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div>
                  <div className="text-sm font-semibold text-amber-900">
                    This demo supports up to {ANONYMOUS_MAX_PAGES} pages
                  </div>
                  <div className="text-xs text-amber-800">{pageLimitError}</div>
                </div>
              </div>
              <Link
                to="/signup"
                className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600"
              >
                Sign up free
              </Link>
            </div>
          ) : (
            <IdleExampleLoop />
          )}
        </>
      )}

      {phase === "processing" && (
        <div className="px-2 py-6">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-emerald" />
            <div>
              <div className="text-sm font-semibold text-ink">Parsing on your device…</div>
              <div className="text-xs text-muted-foreground">
                Reading page {currentPage} — {liveFileName || pendingFiles[currentFileIndex]?.name || ""}
              </div>
            </div>
          </div>
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-surface-muted">
            <motion.div
              className="h-full bg-emerald"
              initial={{ width: "5%" }}
              animate={{ width: `${Math.min(95, currentPage * 10)}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald">
            <ShieldCheck className="h-3 w-3" /> Zero network activity — watch your DevTools Network tab
          </div>
        </div>
      )}

      {phase === "error" && (
        <div className="px-2 py-6">
          <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <div className="text-sm font-semibold text-ink">Couldn't parse that file</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{errorMessage}</div>
            </div>
          </div>
          <button
            onClick={reset}
            className="mt-4 inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-xs font-semibold text-ink transition hover:bg-surface-muted"
          >
            Try another statement
          </button>
        </div>
      )}

      {phase === "done" && (
        <div className="px-2 py-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Extracted from your file
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-soft px-2 py-0.5 font-mono text-[10px] font-medium text-accent-foreground">
              <ShieldCheck className="h-3 w-3 text-emerald" /> Parsed on-device
            </span>
          </div>
          <ul className="space-y-1.5">
            {shown.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium text-ink">{t.description}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">{t.date}</div>
                </div>
                <span
                  className={`shrink-0 font-mono text-sm tabular-nums ${
                    t.amount > 0 ? "text-emerald" : "text-destructive"
                  }`}
                >
                  {t.amount > 0 ? "+" : ""}
                  {t.amount.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {allTransactions.length} transaction{allTransactions.length === 1 ? "" : "s"} extracted
              {remaining > 0 ? ` · ${remaining} more in full preview` : ""}
              {flaggedCount > 0 ? ` · ${flaggedCount} flagged for review` : ""}
            </span>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Link
              to="/preview"
              className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2.5 text-xs font-semibold text-background transition hover:bg-ink/90"
            >
              Continue to full preview & export <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <button
              onClick={reset}
              className="rounded-md border border-border bg-background px-3 py-2.5 text-xs font-medium text-ink transition hover:bg-surface-muted"
            >
              Try another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Loops the hardcoded example rows, one at a time, until a real file is dropped. */
function IdleExampleLoop() {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    function step(count: number) {
      if (cancelled) return;
      if (count <= EXAMPLE_ROWS.length) {
        setVisibleCount(count);
        timer = setTimeout(() => step(count + 1), count === 0 ? 500 : 550);
      } else {
        // Hold on the full set for a beat, then reset and loop.
        timer = setTimeout(() => step(0), 2200);
      }
    }
    step(0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="mt-3 rounded-xl border border-border bg-surface-muted/40 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <Sparkles className="h-3 w-3 text-emerald" />
        Example — drop your own PDF to try it live
      </div>
      <ul className="space-y-1.5">
        <AnimatePresence initial={false}>
          {EXAMPLE_ROWS.slice(0, visibleCount).map((row) => (
            <motion.li
              key={row.date + row.description}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.32, ease: "easeOut" }}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <div className="truncate font-medium text-ink/90">{row.description}</div>
                <div className="font-mono text-[11px] text-muted-foreground">{row.date}</div>
              </div>
              <span
                className={`shrink-0 font-mono text-sm tabular-nums ${
                  row.amount > 0 ? "text-emerald" : "text-destructive"
                }`}
              >
                {row.amount > 0 ? "+" : ""}
                {row.amount.toFixed(2)}
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
