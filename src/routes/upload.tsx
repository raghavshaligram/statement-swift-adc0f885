import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatementDropzone } from "@/components/statement-dropzone";
import { ParseQueue } from "@/components/parse-queue";
import { useStatementStore } from "@/lib/statement-store";
import { parseStatementFile } from "@/lib/pdf/parse-statement";
import { getPdfPageCount } from "@/lib/pdf/extract-text";
import { FREE_TIER_MAX_PAGES } from "@/lib/pricing-constants";
import { OCR_LANGUAGES } from "@/lib/pdf/ocr-languages";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Convert · LedgerLocal" },
      { name: "description", content: "Upload PDF bank statements. Processing happens on your device." },
      { property: "og:title", content: "Convert · LedgerLocal" },
      { property: "og:description", content: "On-device PDF to Excel conversion." },
    ],
  }),
  component: UploadPage,
});

function UploadPage() {
  const nav = useNavigate();
  const [pageLimitError, setPageLimitError] = useState<string | null>(null);
  const [ocrLanguage, setOcrLanguage] = useState<string>("eng");

  const pendingFiles = useStatementStore((s) => s.pendingFiles);
  const setPendingFiles = useStatementStore((s) => s.setPendingFiles);
  const removePendingFile = useStatementStore((s) => s.removePendingFile);
  const phase = useStatementStore((s) => s.phase);
  const reset = useStatementStore((s) => s.reset);
  const startProcessing = useStatementStore((s) => s.startProcessing);
  const setProgress = useStatementStore((s) => s.setProgress);
  const finishProcessing = useStatementStore((s) => s.finishProcessing);
  const failProcessing = useStatementStore((s) => s.failProcessing);

  async function handleFiles(list: FileList | File[]) {
    const arr = Array.from(list).filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );
    if (!arr.length) return;
    setPageLimitError(null);

    // Free-tier page-per-statement check before any real parsing work.
    const pageCounts = await Promise.all(
      arr.map(async (f) => ({ file: f, pages: await getPdfPageCount(f) }))
    );
    const tooLong = pageCounts.filter((p) => p.pages > FREE_TIER_MAX_PAGES);
    if (tooLong.length > 0) {
      const names = tooLong.map((t) => `${t.file.name} (${t.pages} pages)`).join(", ");
      setPageLimitError(
        `${names} ${tooLong.length > 1 ? "exceed" : "exceeds"} the ${FREE_TIER_MAX_PAGES}-page free limit. Sign up for Pro to convert longer statements, or remove ${tooLong.length > 1 ? "these files" : "this file"} and try again.`
      );
      return;
    }

    reset();
    setPendingFiles(arr);
    startProcessing();

    const statements = [];
    try {
      for (let i = 0; i < arr.length; i++) {
        const statement = await parseStatementFile(
          arr[i],
          (page, total) => setProgress(i, page, total),
          [ocrLanguage]
        );
        statements.push(statement);
      }
      finishProcessing(statements);
    } catch (err) {
      failProcessing(err instanceof Error ? err.message : "Something went wrong while parsing.");
    }
  }

  const showQueue = phase !== "idle" && pendingFiles.length > 0;

  return (
    <AppShell title="Convert statements">
      <div className="mx-auto max-w-4xl space-y-6">
        {!showQueue && (
          <>
            <StatementDropzone variant="full" onFiles={handleFiles} />

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <label htmlFor="ocr-language">If a scanned statement is dropped, read it as:</label>
              <select
                id="ocr-language"
                value={ocrLanguage}
                onChange={(e) => setOcrLanguage(e.target.value)}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs text-ink"
              >
                {OCR_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            {pageLimitError && (
              <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div className="flex-1 text-sm text-amber-900">
                  {pageLimitError}
                  <Link to="/pricing" className="ml-2 font-semibold text-amber-900 underline hover:no-underline">
                    See Pro plans →
                  </Link>
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Multi-bank bundles", "Drop statements from different banks together."],
                ["Global bank coverage", "Chase, BofA, Wells Fargo, ICICI, HDFC, SBI and more."],
                ["Text-based PDFs", "Works with any statement pdf.js can read text from."],
              ].map(([t, b]) => (
                <div key={t} className="rounded-lg border border-border bg-card p-4">
                  <div className="text-sm font-semibold text-ink">{t}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{b}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {showQueue && (
          <div className="rounded-2xl border border-border bg-card p-2">
            <ParseQueue
              onReview={() => nav({ to: "/preview" })}
              onRemove={(i) => removePendingFile(i)}
            />
            {(phase === "done" || phase === "error") && (
              <div className="px-3 pb-3 pt-1 text-center">
                <button
                  onClick={() => reset()}
                  className="text-xs font-medium text-muted-foreground hover:text-ink"
                >
                  Convert another statement
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
