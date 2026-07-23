import type { ReactNode } from "react";
import { TopNav } from "@/components/top-nav";

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
}: {
  title?: string;
  children: ReactNode;
  toolbar?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface-muted/40">
      <TopNav />
      <div className="mx-auto max-w-7xl px-6 py-8">
        {(title || toolbar) && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
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
