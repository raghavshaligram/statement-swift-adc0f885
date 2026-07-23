import type { ReactNode } from "react";
import { TopNav } from "@/components/top-nav";
import { cn } from "@/lib/utils";

/**
 * Shell for the workflow pages (Upload/Preview/Export). Used to be a
 * sidebar layout with its own step 1/2/3 indicator; now it's a full-width
 * content area under the persistent TopNav, and the active nav pill in
 * TopNav is the step indicator -- no separate one here.
 */
export function AppShell({
  title,
  children,
  toolbar,
  fullWidth = false,
}: {
  title?: string;
  children: ReactNode;
  toolbar?: ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className="min-h-screen bg-surface-muted/40">
      <TopNav />
      <div
        className={cn(
          "mx-auto px-4 py-5",
          fullWidth ? "w-full max-w-[1920px]" : "max-w-7xl"
        )}
      >
        {(title || toolbar) && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            {title ? (
              <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h1>
            ) : <span />}
            {toolbar}
          </div>
        )}
        <main>{children}</main>
      </div>
    </div>
  );
}
