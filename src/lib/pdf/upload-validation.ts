/**
 * Shared upload validation -- page-limit + sign-in checks, used by both
 * real upload entry points (upload.tsx, HeroUploadCard in index.tsx).
 * Deliberately factored out into one place: this exact kind of logic
 * living separately in two files is what caused two real bugs earlier
 * this session (a stale file-type filter in one location that never got
 * updated when the other one did). One function, one source of truth.
 *
 * Image lifetime tracking, added per a real product decision: unlike
 * PDFs (unlimited separate conversions, each just checked per-file
 * against the page cap -- no persistent tracking, ever), images use a
 * LIFETIME cumulative count once signed in, matching CapyParse's actual
 * real free tier (verified directly this session: "10 pages, lifetime
 * pool, no expiry"). This is a deliberate difference between the two
 * input types, not an oversight -- PDFs stay uncapped over time, images
 * don't. Enforced server-side via a Postgres RPC (increment_image_usage),
 * not just a client-side check, since a client-only check can't actually
 * stop someone from calling Supabase directly to bypass it. See the
 * migration this file's PR/commit references for the actual schema.
 */

import { getPdfPageCount, isPageLimitExempt } from "./extract-text";
import { ANONYMOUS_MAX_PAGES, SIGNED_IN_MAX_PAGES } from "../pricing-constants";
import { supabase } from "@/integrations/supabase/client";

const IMAGE_EXT_RE = /\.(jpe?g|png|webp)$/i;

function isImageFile(f: File): boolean {
  return f.type.startsWith("image/") || IMAGE_EXT_RE.test(f.name);
}

export type UploadValidation =
  | { ok: true }
  | { ok: false; message: string; requiresSignIn: boolean };

/**
 * Validates a batch of files against the free-tier page limit before any
 * real parsing starts.
 *
 * PDFs: checked per-file, against each PDF's own real page count (a
 * genuinely large single PDF should be blocked on its own) -- no
 * persistent tracking across separate uploads, ever.
 *
 * Images: three real gates --
 *   1. Mandatory sign-in. Image OCR costs the same to run as scanned-PDF
 *      OCR (the actual justification for gating that category at all,
 *      unlike the free/unlimited format-conversion inputs), so it
 *      shouldn't be free-for-anyone the way it accidentally was.
 *   2. A real, server-enforced LIFETIME count (increment_image_usage
 *      RPC), not just a per-batch check -- someone uploading 8 images,
 *      then another 8 five minutes later, then another 8, should still
 *      hit the real limit, not reset it by splitting into smaller
 *      batches. The RPC atomically checks-and-reserves in one call (row
 *      locked server-side), so two simultaneous uploads from the same
 *      user (e.g. two open tabs) can't both succeed past the limit.
 *   3. The RPC call itself also naturally covers "the batch alone
 *      exceeds what's left" -- no separate per-batch check needed on
 *      top of it.
 *
 * Format-conversion files (IIF/CSV/OFX/QFX/QIF/MT940) remain fully
 * exempt, per the pricing decision from an earlier session.
 */
export async function validateUploadBatch(files: File[], isSignedIn: boolean): Promise<UploadValidation> {
  const maxPages = isSignedIn ? SIGNED_IN_MAX_PAGES : ANONYMOUS_MAX_PAGES;

  const images = files.filter((f) => isImageFile(f) && !isPageLimitExempt(f));
  if (images.length > 0 && !isSignedIn) {
    return {
      ok: false,
      requiresSignIn: true,
      message:
        images.length === 1
          ? "Sign up free to convert a photo or scanned image."
          : `Sign up free to convert photos or scanned images (${images.length} in this batch).`,
    };
  }

  if (images.length > 0) {
    // Real server-side check: atomically verifies remaining lifetime quota
    // and reserves it in the same call, rather than trusting a client-side
    // count that could just be skipped by calling Supabase directly.
    // `as never` casts below are a temporary type-safety workaround --
    // this RPC function doesn't exist in the auto-generated types.ts yet
    // because the migration hasn't been run. Once it's run and types are
    // regenerated (standard Supabase/Lovable Cloud flow), remove both
    // `as never` casts and this comment.
    const { data: allowed, error } = await supabase.rpc("increment_image_usage" as never, {
      p_count: images.length,
      p_limit: SIGNED_IN_MAX_PAGES,
    } as never);

    if (error) {
      // Fail closed on a real error (not "limit reached", but something
      // actually broke -- e.g. the migration hasn't been run yet) rather
      // than silently letting the upload through unchecked.
      return {
        ok: false,
        requiresSignIn: false,
        message: "Couldn't verify your image conversion quota right now. Please try again in a moment.",
      };
    }

    if (!allowed) {
      return {
        ok: false,
        requiresSignIn: false,
        message: `You've used your free lifetime image conversion allowance (${SIGNED_IN_MAX_PAGES} pages). Upgrade to Pro for unlimited image conversions.`,
      };
    }
  }

  const pdfs = files.filter((f) => !isImageFile(f) && !isPageLimitExempt(f));
  for (const pdf of pdfs) {
    const pages = await getPdfPageCount(pdf);
    if (pages > maxPages) {
      return {
        ok: false,
        requiresSignIn: false,
        message: isSignedIn
          ? `${pdf.name} is too large for your current plan (${pages} pages, limit ${maxPages}). Upgrade to Pro to convert larger statements.`
          : `${pdf.name} is too large for your current plan (${pages} pages, limit ${maxPages}). Sign up free for a higher limit, or upgrade to Pro for no limit at all.`,
      };
    }
  }

  return { ok: true };
}
