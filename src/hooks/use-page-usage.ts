import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { SIGNED_IN_MAX_PAGES } from "@/lib/pricing-constants";

/**
 * Real lifetime page usage -- PDFs and images combined into one shared
 * pool (see supabase/migrations/20260725_page_usage_lifetime_tracking.sql
 * and upload-validation.ts for the full reasoning). Only meaningful once
 * signed in -- anonymous users aren't tracked at all (no persistent
 * identity, and PDFs stay per-conversion-only for that tier).
 *
 * Refetches after every successful upload via the `refresh` trigger param,
 * since the count changes server-side (via increment_page_usage) as a
 * side effect of a successful conversion, not something this hook itself
 * controls.
 */
export function usePageUsage(refreshKey: number) {
  const { user } = useAuth();
  const [used, setUsed] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setUsed(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    // `as never` cast: same temporary workaround as upload-validation.ts --
    // get_page_usage() isn't in the auto-generated types.ts until the
    // migration is run and types are regenerated. Remove then.
    supabase
      .rpc("get_page_usage" as never)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && typeof data === "number") setUsed(data);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, refreshKey]);

  return { used, limit: SIGNED_IN_MAX_PAGES, loading, isSignedIn: !!user };
}
