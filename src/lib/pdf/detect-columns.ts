import type { TextItem } from "./extract-text";

export type ColumnRole =
  | "date"
  | "valueDate"
  | "description"
  | "amount"
  | "deposit"
  | "withdrawal"
  | "balance"
  | "tranType"
  | "tranId"
  | "chequeDetails"
  | "drCrColumn";

export type DetectedColumn = {
  role: ColumnRole;
  label: string;
  xStart: number; // inclusive left boundary for classifying a number into this column
  xEnd: number; // exclusive right boundary
};

export type HeaderInfo = {
  columns: DetectedColumn[];
  headerRowIndex: number; // index into the rows array this header was found on
};

// Keyword -> role mapping. Order matters for role priority when a single
// header label could plausibly match more than one (it generally won't, but
// e.g. "Amount" should never accidentally match "Withdrawal Amount" as both
// deposit and withdrawal — longer/more specific keywords are checked first).
//
// "Value Date" used to map to the same "date" role as the primary
// transaction date -- a real bug (both columns would collide into one
// role). Split out as its own role, since some statements (confirmed via a
// real sample) have both as genuinely distinct columns.
const ROLE_KEYWORDS: Array<{ role: ColumnRole; patterns: RegExp[] }> = [
  { role: "valueDate", patterns: [/^value date$/i] },
  { role: "date", patterns: [/^date$/i, /^transaction date$/i, /^txn date$/i] },
  { role: "description", patterns: [/^particulars?$/i, /^description$/i, /^narration$/i, /^details?$/i, /^transaction details?$/i] },
  { role: "withdrawal", patterns: [/^withdrawals?$/i, /^debit$/i, /^dr\.?$/i] },
  { role: "deposit", patterns: [/^deposits?$/i, /^credit$/i, /^cr\.?$/i] },
  { role: "balance", patterns: [/^balance$/i, /^closing balance$/i, /^running balance$/i, /^bal\.?$/i] },
  { role: "amount", patterns: [/^amount$/i, /^amt\.?$/i] },
  // New optional columns, confirmed via a real sample (Federal Bank) --
  // not every statement has these, but when present they're real, distinct
  // columns, not something worth trying to infer from the description text.
  { role: "tranType", patterns: [/^tran(?:saction)? type$/i, /^txn type$/i] },
  { role: "tranId", patterns: [/^tran(?:saction)? id$/i, /^txn id$/i, /^reference no\.?$/i, /^ref\.? no\.?$/i] },
  { role: "chequeDetails", patterns: [/^cheque details$/i, /^cheque no\.?$/i, /^chq no\.?$/i, /^cheque number$/i] },
  // Recognized purely so its raw text (e.g. "Cr") gets excluded from the
  // description via consumedColumnText in parse-transactions.ts -- NOT used
  // as the source of the authoritative drCr field, since real evidence shows
  // this column reflects balance standing, not transaction direction, and
  // that's computed from the balance instead (see parse-transactions.ts).
  { role: "drCrColumn", patterns: [/^dr\s*\/?\s*cr\.?$/i, /^dr\/cr$/i] },
];

function matchRole(label: string): ColumnRole | null {
  const cleaned = label.trim().replace(/[*:]+$/, "");
  for (const { role, patterns } of ROLE_KEYWORDS) {
    if (patterns.some((p) => p.test(cleaned))) return role;
  }
  return null;
}

type Row = { y: number; items: TextItem[]; text: string };

/**
 * Scans a page's reconstructed rows for a header row — one containing at
 * least two recognizable column-role keywords (so a stray "Balance" mention
 * in a paragraph elsewhere doesn't get mistaken for the real header). Returns
 * the x-position boundaries for each detected column, derived from the
 * midpoints between adjacent header labels, so any number on a transaction
 * row can be classified by which column it visually falls under — instead of
 * assuming "last two numbers are amount then balance," which breaks the
 * moment a statement uses a different column order or a split debit/credit
 * layout.
 */
export function findHeaderRow(rows: Row[], pageWidth: number): HeaderInfo | null {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const matches: Array<{ role: ColumnRole; label: string; x: number }> = [];

    for (const item of row.items) {
      const role = matchRole(item.str);
      if (role) matches.push({ role, label: item.str, x: item.x });
    }

    if (matches.length < 2) continue; // not confident this is the header

    matches.sort((a, b) => a.x - b.x);
    const columns: DetectedColumn[] = matches.map((m, i) => {
      const prevX = i === 0 ? 0 : (matches[i - 1].x + m.x) / 2;
      const nextX = i === matches.length - 1 ? pageWidth : (m.x + matches[i + 1].x) / 2;
      return { role: m.role, label: m.label, xStart: prevX, xEnd: nextX };
    });

    return { columns, headerRowIndex: rowIndex };
  }

  return null;
}

/** Finds which detected column a given x-coordinate falls under, if any. */
export function classifyByColumn(x: number, columns: DetectedColumn[]): DetectedColumn | null {
  return columns.find((c) => x >= c.xStart && x < c.xEnd) ?? null;
}

/**
 * Returns just the header labels found, in left-to-right order, e.g.
 * ["Date", "Value Date", "Particulars", "Tran Type", ...]. Used as a
 * secondary bank-identification signal (see bank-header-signatures.ts) --
 * some banks' statements use a distinctive enough column set/order that it
 * can help confirm or narrow down the issuing bank alongside the primary
 * text-signature detection.
 */
export function headerLabelsInOrder(header: HeaderInfo): string[] {
  return [...header.columns].sort((a, b) => a.xStart - b.xStart).map((c) => c.label.trim());
}
