/**
 * Shared upload validation -- page-limit + sign-in checks, used by both
 * real upload entry points (upload.tsx, HeroUploadCard in index.tsx).
 * Deliberately factored out into one place: this exact kind of logic
 * living separately in two files is what caused two real bugs earlier
 * this session (a stale file-type filter in one location that never got
 * updated when the other one did). One function, one source of truth.
 */

import { getPdfPageCount, isPageLimitExempt } from "./extract-text";
import { ANONYMOUS_MAX_PAGES, SIGNED_IN_MAX_PAGES } from "../pricing-constants";

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
 * genuinely large single PDF should be blocked on its own).
 *
 * Images: two real gates, not the "always counts as 1, always passes"
 * behavior from before this fix --
 *   1. Mandatory sign-in. Image OCR costs the same to run as scanned-PDF
 *      OCR (the actual justification for gating that category at all,
 *      unlike the free/unlimited format-conversion inputs), so it
 *      shouldn't be free-for-anyone the way it accidentally was.
 *   2. The TOTAL number of images in the batch counts toward the page
 *      limit, summed -- not checked per-file. A per-file check is
 *      meaningless for images (each one is always "1"), so someone
 *      uploading 20 separate photos in one batch would previously have
 *      passed every individual check while clearly exceeding any
 *      reasonable "10 pages" allowance in aggregate.
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

  if (images.length > maxPages) {
    return {
      ok: false,
      requiresSignIn: false,
      message: `${images.length} images in this batch exceeds your current plan's ${maxPages}-page limit. Upgrade to Pro for no limit.`,
    };
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
