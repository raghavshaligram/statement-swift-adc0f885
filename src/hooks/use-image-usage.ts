import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { SIGNED_IN_MAX_PAGES } from "@/lib/pricing-constants";

/**
 * Real lifetime image-conversion usage, read via the get_image_usage() RPC
 * (see supabase/migrations/20260725_image_usage_lifetime_tracking.sql).
 * Only meaningful once signed in -- anonymous users can't upload images at
 * all (see upload-validation.ts), so there's nothing to show them.
 *
 * Refetches after every successful upload via the `refresh` trigger param,
 * since the count changes server-side (via increment_image_usage) as a
 * side effect of a successful conversion, not something this hook itself
 * controls.
 */
export function useImageUsage(refreshKey: number) {
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
    // get_image_usage() isn't in the auto-generated types.ts until the
    // migration is run and types are regenerated. Remove then.
    supabase
      .rpc("get_image_usage" as never)
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
