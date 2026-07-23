/**
 * Persistent top navbar for the app's workflow pages (Upload/Preview/Export,
 * via AppShell) plus links back out to Landing/Pricing. Replaces the old
 * sidebar — this app's navigation is linear (Upload -> Preview -> Export),
 * so a fixed top bar covers it without the sidebar's real-estate cost.
 *
 * The active nav pill doubles as the step indicator: there's no separate
 * 1/2/3 badge anymore, whichever link is highlighted green IS the current step.
 */
import { Link, useLocation } from "@tanstack/react-router";
import { FileSpreadsheet, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { to: "/upload", label: "Upload" },
  { to: "/preview", label: "Preview" },
  { to: "/export", label: "Export" },
] as const;

export function TopNav() {
  const loc = useLocation();

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between gap-4 border-b border-white/10 bg-ink px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald text-primary-foreground">
            <FileSpreadsheet className="h-4 w-4" />
          </div>
          <span className="text-[15px] font-bold tracking-tight text-white">LedgerLocal</span>
        </Link>
        <span className="hidden h-4 w-px shrink-0 bg-white/15 sm:block" aria-hidden />
        <span className="hidden shrink-0 items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 font-mono text-[10px] font-medium text-white/60 sm:inline-flex">
          <Lock className="h-2.5 w-2.5" /> on-device
        </span>
      </div>

      <nav className="hidden items-center gap-1 md:flex">
        {NAV_LINKS.map((item) => {
          const active = loc.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                active ? "bg-emerald text-primary-foreground" : "text-white/60 hover:text-white"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex shrink-0 items-center gap-1.5 font-mono text-xs text-white/70">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald" aria-hidden />
        local
      </div>
    </header>
  );
}
