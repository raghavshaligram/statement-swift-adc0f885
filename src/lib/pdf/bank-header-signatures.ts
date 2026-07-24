import type { BankId } from "./bank-detection";

/**
 * Secondary bank-identification signal, based on the exact set/order of
 * column headers a statement uses -- alongside the primary signal (scanning
 * the full statement text for the bank's name/domain, in bank-detection.ts).
 *
 * Why this exists: some banks' statements use a distinctive enough column
 * layout that it can help confirm or narrow down the issuing bank even when
 * the bank's name doesn't appear clearly in the extracted text (e.g. a page
 * that's mostly a transaction table with the letterhead on a separate page
 * OCR didn't pick up cleanly). This is deliberately a FALLBACK signal, only
 * consulted when the primary text-based detection doesn't find a match --
 * a bank's name printed directly in the statement is a much more direct,
 * reliable signal than an inferred column-layout fingerprint, since
 * multiple banks can plausibly share a similar generic layout
 * (Date/Description/Withdrawal/Deposit/Balance is common enough on its own
 * to not mean much by itself).
 *
 * STATUS: seeded with exactly one real, confirmed signature (Federal Bank,
 * from a real sample statement checked this session). This list is meant to
 * grow as more real sample statements from different banks get checked --
 * each new confirmed signature is a small, additive entry here, not a
 * redesign. Don't add a signature based on assumption or a single
 * third-party tool's export schema alone -- confirm it reflects the real
 * statement's own header row first (see the Federal Bank entry's comment
 * for the distinction that mattered here).
 */

export type HeaderSignature = {
  bank: BankId;
  // Exact header labels, in left-to-right order, as they appear on the real
  // statement. Matching requires all of these labels present in this exact
  // order (a subset match would be too loose -- many statements share 3-4
  // of these generic labels without being the same bank).
  labels: string[];
};

export const HEADER_SIGNATURES: HeaderSignature[] = [
  {
    bank: "federal_bank",
    // Confirmed via a real sample statement this session. Note: the sample
    // available was a CapyParse CSV export, not the raw PDF itself -- these
    // exact 10 columns matched what CapyParse output, which is presumed to
    // mirror the real statement's own header row (Tran Type values like
    // "TFR"/"FT"/"MB" don't map predictably from the description text,
    // strongly suggesting they're real columns in the source statement, not
    // something CapyParse derived) but hasn't been confirmed against an
    // actual Federal Bank PDF directly. Worth double-checking against a
    // real PDF before leaning on this signature with full confidence.
    labels: ["Date", "Value Date", "Particulars", "Tran Type", "Tran ID", "Cheque Details", "Withdrawals", "Deposits", "Balance", "DR /CR"],
  },
];

/**
 * Checks a statement's detected header labels against the known-signature
 * registry. Returns the matching bank if found, or null if no confident
 * match -- callers should treat this as a fallback, only using the result
 * when primary text-based detection already returned "unknown".
 */
export function detectBankFromHeaderSignature(headerLabels: string[]): BankId | null {
  const normalized = headerLabels.map((l) => l.trim().toLowerCase());
  for (const sig of HEADER_SIGNATURES) {
    const sigNormalized = sig.labels.map((l) => l.trim().toLowerCase());
    if (
      sigNormalized.length === normalized.length &&
      sigNormalized.every((label, i) => label === normalized[i])
    ) {
      return sig.bank;
    }
  }
  return null;
}
