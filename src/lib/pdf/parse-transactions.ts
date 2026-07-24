import type { PageText, TextItem } from "./extract-text";
import { inferDateOrder, resolveAmbiguousDate, type DateOrder } from "./date-inference";
import { findHeaderRow, classifyByColumn, type DetectedColumn } from "./detect-columns";

export type RawTransaction = {
  date: string;
  description: string;
  amount: number;
  balance: number | null;
  sourcePage: number;
  confidence: number; // 0-99, base score before the balance-continuity pass applied in parseTransactionsFromPages
  sourceLines: string[]; // raw text of every row in this transaction's block, for the side-by-side review view
  // Optional fields, only populated when the statement's own header row has
  // a distinct column for them (confirmed via a real sample -- these are
  // not derived/guessed from the description text, since e.g. a bank's
  // internal transaction-type code often doesn't map predictably from the
  // description's own wording).
  valueDate: string | null;
  tranType: string | null;
  tranId: string | null;
  chequeDetails: string | null;
  // Always computable regardless of whether the statement has its own
  // explicit DR/CR column, since it's just the sign of the amount.
  drCr: "Dr" | "Cr";
};

// --- date parsing -----------------------------------------------------------

// Covers the common statement date formats. "ambiguous" formats are numeric
// with no month name, so day/month order is resolved by the document-wide
// inference in date-inference.ts rather than guessed per-row.
//
// [oO0] appears in a few digit positions below -- OCR commonly misreads the
// digit 0 as the letter O/o (a real, well-established confusion, confirmed
// on a real scanned statement this session: "01" OCR'd as "O1"). Also made
// the separator optional in the month-name pattern, since OCR sometimes
// drops the space/dash entirely ("01Nov2023"). Deliberately NOT trying to
// handle every possible OCR character misread (e.g. a stray "t" standing in
// for "1", or "z" for "2", both also seen on that same real statement) --
// that starts to risk false-positive matches on real non-date text for
// diminishing returns on OCR quality this poor. Severely garbled OCR output
// is an expected, honest limitation, not something worth chasing indefinitely.
const DATE_PATTERNS: Array<{
  re: RegExp;
  kind: "iso" | "monthName" | "ambiguous";
}> = [
  { re: /\b(\d{4})-(\d{2})-(\d{2})\b/, kind: "iso" }, // YYYY-MM-DD
  { re: /\b([\dOo]{1,2})[-\s]?([A-Za-z]{3})[-\s]?(\d{4})\b/, kind: "monthName" }, // 15-Jan-2025, tolerant of missing separator and O/0 confusion
  { re: /\b([A-Za-z]{3,9})\s+([\dOo]{1,2}),?\s+(\d{4})\b/, kind: "monthName" }, // Jan 15, 2025 (month first)
  { re: /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/, kind: "ambiguous" }, // MM/DD/YYYY or DD/MM/YYYY
  { re: /\b(\d{1,2})-(\d{1,2})-(\d{4})\b/, kind: "ambiguous" }, // MM-DD-YYYY or DD-MM-YYYY
];

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

/** Finds the first date-like match in text and resolves it to ISO, using the document's inferred date order for ambiguous numeric formats. */
function findDate(
  text: string,
  dateOrder: DateOrder
): { iso: string; matchedText: string; unambiguous: boolean } | null {
  for (const { re, kind } of DATE_PATTERNS) {
    const m = text.match(re);
    if (!m) continue;

    if (kind === "iso") {
      return { iso: `${m[1]}-${m[2]}-${m[3]}`, matchedText: m[0], unambiguous: true };
    }

    if (kind === "monthName") {
      // Two possible group orders: "15-Jan-2025" (day, month, year) or
      // "Jan 15, 2025" (month, day, year) -- tell them apart by which group
      // is the month name. Normalize O/o -> 0 first (see the DATE_PATTERNS
      // comment on why the regex tolerates that OCR confusion) so isNaN and
      // the day-number parsing below see a real digit string, not "O1".
      const g1 = m[1].replace(/[Oo]/g, "0");
      const g2 = m[2].replace(/[Oo]/g, "0");
      const isMonthFirst = isNaN(parseInt(g1, 10));
      const monthStr = isMonthFirst ? g1 : g2;
      const dayStr = isMonthFirst ? g2 : g1;
      const month = MONTHS[monthStr.toLowerCase().slice(0, 3)];
      if (!month) continue;
      return { iso: `${m[3]}-${month}-${dayStr.padStart(2, "0")}`, matchedText: m[0], unambiguous: true };
    }

    // ambiguous numeric -- resolve using the document-wide inferred order,
    // with per-token override when this specific date is independently
    // unambiguous (see resolveAmbiguousDate). Note: even when resolveAmbiguousDate
    // finds a per-token unambiguous resolution (e.g. day > 12), we still mark
    // this "not unambiguous" for scoring purposes, since that nuance isn't
    // tracked back here -- treating the whole "ambiguous" pattern kind as the
    // slightly-less-certain case is a reasonable simplification.
    let year = m[3];
    if (year.length === 2) year = `20${year}`;
    const iso = resolveAmbiguousDate(m[1], m[2], year, dateOrder);
    if (iso) return { iso, matchedText: m[0], unambiguous: false };
  }
  return null;
}

function hasDate(text: string): boolean {
  return DATE_PATTERNS.some(({ re }) => re.test(text));
}

// --- amount parsing -----------------------------------------------------------

// Matches a single standalone number-shaped token -- used against individual
// PDF text items (which usually carry one number each), not concatenated row
// text, so we keep each number's real x-position for column classification.
// Handles both Western grouping (100,116 / 1,234,567 -- repeating 3-digit
// groups) and Indian lakh/crore grouping (1,00,116 / 12,34,567 -- a leading
// 1-2 digit group, then repeating 2-digit groups, then one final 3-digit
// group before the decimal). Missing the Indian case entirely broke any
// statement amount >= 1 lakh -- confirmed on the real ICICI statement, where
// it silently dropped whole transactions with no matched numbers at all.
const AMOUNT_ITEM_RE = /^\(?-?\$?(?:\d{1,2}(?:,\d{2})+,\d{3}|\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{2})\)?$/;

function parseAmountToken(token: string): number {
  const negative = /^\(.*\)$/.test(token.trim()) || token.trim().startsWith("-");
  const cleaned = token.replace(/[()$,\s-]/g, "");
  const value = parseFloat(cleaned);
  return negative ? -Math.abs(value) : value;
}

type NumberToken = { value: number; raw: string; x: number };

function findNumberItems(items: TextItem[]): NumberToken[] {
  return items
    .filter((it) => AMOUNT_ITEM_RE.test(it.str.trim()))
    .map((it) => ({ value: parseAmountToken(it.str), raw: it.str, x: it.x }));
}

// --- row reconstruction -----------------------------------------------------------

export type Row = { y: number; items: TextItem[]; text: string };

// Groups text items into visual rows by clustering nearby y-coordinates, then
// sorts each row's items left-to-right by x. PDFs rarely give us perfectly
// aligned y-values for the same visual line, so we use a tolerance band.
export function groupIntoRows(items: TextItem[], yTolerance = 3): Row[] {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: Row[] = [];

  for (const item of sorted) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(item.y - last.y) <= yTolerance) {
      last.items.push(item);
      last.y = (last.y * (last.items.length - 1) + item.y) / last.items.length;
    } else {
      rows.push({ y: item.y, items: [item], text: "" });
    }
  }

  for (const row of rows) {
    row.items.sort((a, b) => a.x - b.x);
    row.text = row.items.map((i) => i.str).join(" ").replace(/\s+/g, " ").trim();
  }

  return rows;
}

// --- multi-line transaction block merging -----------------------------------------------------------

type Block = { rows: Row[]; anchorRow: Row };

/**
 * Groups rows into transaction blocks by assigning every row to whichever
 * date-bearing ("anchor") row is nearest to it by position, rather than
 * simply attaching each row to whatever anchor came before it.
 *
 * This matters because real multi-line statements don't always wrap in a
 * consistent "date row, then continuation lines" order — confirmed on a real
 * ICICI statement, where each transaction's line order is actually prefix
 * line -> date+reference+amount+balance line -> payee-name line. A prefix
 * line has no date of its own, so a naive "attach forward from the last seen
 * anchor" approach wrongly steals it into the PREVIOUS transaction's block.
 * Nearest-anchor assignment fixes this: a prefix line sits closer to the
 * anchor it precedes than the one further back, so it correctly attaches
 * forward, while a trailing suffix line sits closer to the anchor it follows
 * and correctly attaches backward — without hardcoding which order any given
 * statement uses.
 *
 * Known residual limitation: rows after the last anchor on a page/document
 * (e.g. a trailing "TOTAL" summary line) have no "next" anchor to compare
 * against, so they attach to the last transaction found. This can pollute
 * the final transaction's description on a page with footer text — a real
 * edge case, not fully solved here, and worth checking for on further real
 * statements.
 */
function groupRowsIntoBlocks(rows: Row[]): Block[] {
  const anchorIndices: number[] = [];
  rows.forEach((row, i) => {
    if (hasDate(row.text)) anchorIndices.push(i);
  });
  if (anchorIndices.length === 0) return [];

  const blockByAnchor = new Map<number, Row[]>();
  for (const idx of anchorIndices) blockByAnchor.set(idx, []);

  for (let i = 0; i < rows.length; i++) {
    let nearest = anchorIndices[0];
    let nearestDist = Math.abs(i - nearest);
    for (const anchorIdx of anchorIndices) {
      const dist = Math.abs(i - anchorIdx);
      // Prefer the later anchor on ties, since interior prefix lines that are
      // equidistant from the previous and next anchor belong to the next
      // transaction, not the previous one (see block comment above).
      if (dist < nearestDist || (dist === nearestDist && anchorIdx > nearest)) {
        nearest = anchorIdx;
        nearestDist = dist;
      }
    }
    blockByAnchor.get(nearest)!.push(rows[i]);
  }

  return anchorIndices.map((idx) => {
    // blockRows are already in ascending row-index order, since the
    // assignment loop above iterates rows in order — so reading order
    // (prefix line, then anchor, then suffix line) is preserved naturally,
    // unlike forcing the anchor row to the front.
    return { rows: blockByAnchor.get(idx)!, anchorRow: rows[idx] };
  });
}

// Noise tokens that show up constantly in UPI/bank-reference-heavy statement
// lines and aren't part of a human-readable payee name -- filtered out when
// assembling the description from a multi-line block.
const NOISE_SEGMENT_RE = /^(upi|imps|neft|rtgs|ach|bil|inft|mmt)$/i;
// Real reference/hash codes mix letters AND digits together (e.g. a UPI
// transaction ID) -- a plain long word like "STARBUCKS" or "SUBSCRIPTION" is
// still just letters, so requiring both is what keeps this filter from
// stripping legitimate merchant names purely for being long.
const LOOKS_LIKE_REFERENCE_RE = /^(?=.*[a-z])(?=.*\d)[a-z0-9]{8,}$/i;
const MOSTLY_DIGITS_RE = /^\d{6,}$/; // long pure-digit account/reference numbers

function buildDescription(block: Block, dateMatchedText: string, consumedAmounts: string[]): string {
  const rawTexts = block.rows.map((r) => r.text);
  let combined = rawTexts.join(" / ");

  combined = combined.replace(dateMatchedText, "");
  for (const tok of consumedAmounts) combined = combined.replace(tok, "");

  const segments = combined
    .split(/[\/\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !NOISE_SEGMENT_RE.test(s))
    .filter((s) => !LOOKS_LIKE_REFERENCE_RE.test(s))
    .filter((s) => !MOSTLY_DIGITS_RE.test(s));

  // Collapse consecutive duplicate segments (e.g. a payee name split across
  // lines sometimes repeats a word right at the line break).
  const deduped: string[] = [];
  for (const s of segments) {
    if (deduped[deduped.length - 1]?.toLowerCase() !== s.toLowerCase()) deduped.push(s);
  }

  const description = deduped.join(" ").replace(/\s+/g, " ").trim();
  return description || "(description not detected)";
}

function buildTransactionFromBlock(
  block: Block,
  columns: DetectedColumn[] | null,
  dateOrder: DateOrder,
  pageNumber: number
): RawTransaction | null {
  const anchorRow = block.anchorRow;
  const dateResult = findDate(anchorRow.text, dateOrder);
  if (!dateResult) return null;

  // Gather every number across every row in the block, keeping x-position.
  const numbers = block.rows.flatMap((r) => findNumberItems(r.items));
  if (numbers.length === 0) return null;

  let amount: number | null = null;
  let balance: number | null = null;
  const consumedRaw: string[] = [];
  // Tracks how the amount was actually resolved, for scoring below --
  // column-based classification is the strongest signal, a 2-number
  // positional fallback is decent, and a single bare number is the weakest.
  let amountSignal: "column" | "positional" | "single" = "single";

  if (columns) {
    // Header-based classification: each number belongs to whichever column
    // it's positioned under, regardless of how many lines the block spans.
    for (const n of numbers) {
      const col = classifyByColumn(n.x, columns);
      if (!col) continue;
      if (col.role === "balance") {
        balance = n.value;
        consumedRaw.push(n.raw);
      } else if (col.role === "deposit") {
        amount = n.value; // positive
        consumedRaw.push(n.raw);
      } else if (col.role === "withdrawal") {
        amount = -Math.abs(n.value);
        consumedRaw.push(n.raw);
      } else if (col.role === "amount" && amount === null) {
        amount = n.value;
        consumedRaw.push(n.raw);
      }
    }
    if (amount !== null) amountSignal = "column";
  }

  if (amount === null) {
    // No column info, or column classification didn't resolve an amount --
    // fall back to positional heuristic across the whole block's numbers.
    const combinedText = block.rows.map((r) => r.text).join(" ");
    if (numbers.length >= 2) {
      const last = numbers[numbers.length - 1];
      const secondLast = numbers[numbers.length - 2];
      amount = secondLast.value;
      balance = last.value;
      consumedRaw.push(secondLast.raw, last.raw);
      amountSignal = "positional";
    } else if (/\b(opening|closing|beginning|ending)\s+balance\b/i.test(combinedText)) {
      amount = 0;
      balance = numbers[0].value;
      consumedRaw.push(numbers[0].raw);
      amountSignal = "positional"; // a labeled balance line is about as reliable as a 2-number match
    } else {
      amount = numbers[0].value;
      balance = null;
      consumedRaw.push(numbers[0].raw);
      amountSignal = "single";
    }
  }

  // Optional text-based columns -- only populated when the statement's own
  // header row has a distinct column for them. Scans every text item in the
  // block (not just numbers) and classifies by column position, same
  // mechanism already used for numeric columns above. Computed before
  // buildDescription so these values can be excluded from it -- otherwise
  // e.g. a Tran Type code or the Value Date string could leak into the
  // description as spurious extra words.
  let valueDate: string | null = null;
  let tranType: string | null = null;
  let tranId: string | null = null;
  let chequeDetails: string | null = null;
  const consumedColumnText: string[] = [];
  if (columns) {
    for (const row of block.rows) {
      for (const item of row.items) {
        const col = classifyByColumn(item.x, columns);
        if (!col) continue;
        const text = item.str.trim();
        if (!text) continue;
        if (col.role === "valueDate" && valueDate === null) {
          const parsed = findDate(text, dateOrder);
          valueDate = parsed ? parsed.iso : text;
          consumedColumnText.push(item.str);
        } else if (col.role === "tranType" && tranType === null) {
          tranType = text;
          consumedColumnText.push(item.str);
        } else if (col.role === "tranId" && tranId === null) {
          tranId = text;
          consumedColumnText.push(item.str);
        } else if (col.role === "chequeDetails" && chequeDetails === null) {
          chequeDetails = text;
          consumedColumnText.push(item.str);
        } else if (col.role === "drCrColumn") {
          // Not stored -- just excluded from the description. See the role
          // definition in detect-columns.ts for why we don't trust this
          // column's raw value as the authoritative drCr field.
          consumedColumnText.push(item.str);
        }
      }
    }
  }

  const description = buildDescription(block, dateResult.matchedText, [...consumedRaw, ...consumedColumnText]);

  // --- Weighted confidence score ---------------------------------------
  // Base score plus points for each independent signal that came out clean.
  // Calibrated so a fully-clean row (column-matched amount, balance found,
  // clean description, unambiguous date) lands in the high 90s, and a row
  // that only found one bare number lands in the 60s-70s -- roughly matching
  // real-world examples seen during testing against an actual bank statement.
  // The balance-continuity adjustment (the strongest single signal available)
  // is applied afterward in parseTransactionsFromPages, since it needs the
  // neighboring transaction's balance.
  let score = 60;
  score += amountSignal === "column" ? 15 : amountSignal === "positional" ? 8 : -5;
  score += balance !== null ? 10 : 0;
  score += description !== "(description not detected)" && description.trim().length > 2 ? 8 : 0;
  score += dateResult.unambiguous ? 8 : 4;

  return {
    date: dateResult.iso,
    description,
    amount: amount ?? 0,
    balance,
    sourcePage: pageNumber,
    confidence: Math.max(1, Math.min(99, Math.round(score))),
    sourceLines: block.rows.map((r) => r.text),
    valueDate,
    tranType,
    tranId,
    chequeDetails,
    // Real ground-truth evidence (a real Federal Bank sample, verified this
    // session) shows DR/CR reflects the ACCOUNT BALANCE's standing (in
    // credit vs. overdrawn), not the individual transaction's debit/credit
    // direction -- confirmed by a real withdrawal row that still showed
    // "Cr", because the account balance stayed positive. Basing this on the
    // amount's sign instead (the first, wrong assumption here) would have
    // been incorrect on that exact row. Defaults to "Cr" when balance is
    // unknown, since a positive balance is the overwhelmingly common case --
    // this is based on one real sample confirming the pattern for positive
    // balances specifically; worth re-checking against a real statement
    // that goes overdrawn once more samples are available.
    drCr: balance !== null && balance < 0 ? "Dr" : "Cr",
  };
}

/**
 * Generic, bank-agnostic transaction extraction. Three layers of inference,
 * each reading the document's own structure instead of assuming a fixed
 * format:
 *  1. Date order (DMY vs MDY) is inferred once for the whole document
 *     (date-inference.ts), not guessed per-row.
 *  2. Column layout (which x-range holds the date/description/amount/balance/
 *     deposit/withdrawal) is read from each page's own header row
 *     (detect-columns.ts), not assumed to be "last two numbers = amount,
 *     balance."
 *  3. Multi-line transactions (a statement wraps one transaction across
 *     several visual lines) are merged into a single block before any of the
 *     above is applied, so the description isn't limited to whichever single
 *     line happened to contain the date.
 *
 * Blocks that don't fit even this are skipped, and blocks that parse but
 * remain ambiguous (single number, no column match) are marked low-confidence
 * for manual review in the preview screen -- the honest fallback for whatever
 * this generic layer can't fully resolve on its own.
 */
export function parseTransactionsFromPages(pages: PageText[], fullText: string): RawTransaction[] {
  const dateOrder = inferDateOrder(fullText);
  const transactions: RawTransaction[] = [];
  let carriedColumns: DetectedColumn[] | null = null;

  for (const page of pages) {
    if (page.items.length === 0) continue;

    const rows = groupIntoRows(page.items);
    const pageWidth = Math.max(...page.items.map((i) => i.x + i.width), 1);

    const header = findHeaderRow(rows, pageWidth);
    const columns = header ? header.columns : carriedColumns;
    if (header) carriedColumns = header.columns;

    const candidateRows = header ? rows.slice(header.headerRowIndex + 1) : rows;
    const blocks = groupRowsIntoBlocks(candidateRows);

    for (const block of blocks) {
      const txn = buildTransactionFromBlock(block, columns, dateOrder, page.pageNumber);
      if (txn) transactions.push(txn);
    }
  }

  applyBalanceContinuityAdjustment(transactions);

  return transactions;
}

/**
 * Second pass over the full transaction list: for every pair of consecutive
 * transactions that both have a known balance, checks whether the current
 * transaction's amount correctly bridges the previous stated balance to the
 * current one. This is the strongest confidence signal available -- it's an
 * independent arithmetic check against the bank's own numbers, not just an
 * inference about layout -- so it gets applied as an adjustment on top of the
 * base score computed in buildTransactionFromBlock, which can't know about
 * neighboring transactions.
 */
function applyBalanceContinuityAdjustment(transactions: RawTransaction[]): void {
  for (let i = 1; i < transactions.length; i++) {
    const prev = transactions[i - 1];
    const curr = transactions[i];
    if (prev.balance === null || curr.balance === null) continue; // not applicable -- leave base score as-is

    const expected = prev.balance + curr.amount;
    const reconciles = Math.abs(expected - curr.balance) < 0.02;
    const adjustment = reconciles ? 8 : -20;
    curr.confidence = Math.max(1, Math.min(99, Math.round(curr.confidence + adjustment)));
  }
}
