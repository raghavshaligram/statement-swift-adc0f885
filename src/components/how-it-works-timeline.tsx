/**
 * Four-step timeline "How it works" section.
 * Animates in when scrolled into view: horizontal dashed connector draws
 * left→right, step icons pop in sequentially, then copy fades up.
 */
import { useEffect, useRef, useState } from "react";
import { Upload, Cpu, Eye, Download } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    icon: Upload,
    title: "Drop your PDF",
    body: "Drag a text-based bank statement PDF onto the upload area. Supports multi-page statements from 30+ banks across the US, UK, and Canada.",
    chip: "Accepted: digital PDF only — not scanned images",
  },
  {
    icon: Cpu,
    title: "Parsed on your device",
    body: "Transactions are extracted using deterministic rules that run entirely in your browser. No network request is made. Nothing leaves your machine.",
    chip: "Zero bytes sent to any server",
  },
  {
    icon: Eye,
    title: "Review side-by-side",
    body: "Every extracted row is shown next to the raw source text so you can verify accuracy. Edit anything before you export.",
    chip: "Hover any row to highlight its source line",
  },
  {
    icon: Download,
    title: "Download your file",
    body: "Export to Excel, CSV, Tally XML, OFX, QIF, or QBO. Open in your accounting software directly — no reformatting needed.",
    chip: "6 export formats · Free tier included",
  },
];

export function HowItWorksTimeline() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            obs.disconnect();
            break;
          }
        }
      },
      { threshold: 0.2 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      id="how-it-works"
      ref={ref}
      className="border-b border-border bg-background py-24"
    >
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-emerald">
            How it works
          </div>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            Four steps, no surprises
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            From PDF to spreadsheet in under a minute — entirely on your device.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative mt-20">
          {/* Dashed connector line — hidden on mobile, animates width on reveal */}
          <div
            className="pointer-events-none absolute left-0 right-0 top-[72px] hidden -translate-y-1/2 md:block"
            aria-hidden
          >
            <div className="relative mx-auto h-px w-[calc(100%-6rem)]">
              <div className="absolute inset-0 border-t border-dashed border-border" />
              <div
                className={cn(
                  "absolute inset-y-0 left-0 border-t-2 border-dashed border-emerald/60 transition-[width] duration-[1600ms] ease-out",
                  visible ? "w-full" : "w-0",
                )}
              />
            </div>
          </div>

          <ol className="relative grid gap-14 md:grid-cols-4 md:gap-6">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.title}
                  className={cn(
                    "flex flex-col items-center text-center",
                    "transition-all duration-700 ease-out",
                    visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
                  )}
                  style={{ transitionDelay: visible ? `${200 + i * 220}ms` : "0ms" }}
                >
                  <div className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Step {String(i + 1).padStart(2, "0")}
                  </div>
                  <div
                    className={cn(
                      "relative mt-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-card shadow-sm transition-transform duration-500",
                      visible ? "scale-100" : "scale-75",
                    )}
                    style={{ transitionDelay: visible ? `${350 + i * 220}ms` : "0ms" }}
                  >
                    <span className="absolute inset-0 -z-10 rounded-2xl bg-emerald/10 blur-xl" aria-hidden />
                    <Icon className="h-8 w-8 text-emerald" strokeWidth={1.75} />
                  </div>
                  <h3 className="mt-6 text-lg font-bold text-ink">{step.title}</h3>
                  <p className="mt-3 max-w-[16rem] text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                  <div className="mt-5 inline-flex items-center rounded-full border border-emerald/20 bg-emerald-soft/60 px-3 py-1 font-mono text-[11px] font-medium text-emerald">
                    {step.chip}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
