import type { Transaction } from "../statement-store";
import type { ExportOptions } from "./types";
import { sortByDate, triggerDownload } from "./types";
import { formatAmount } from "../pdf/detect-currency";

function csvEscape(value: string | number): string {
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function fmt(value: number, options: ExportOptions, currency: string | null): string {
  return options.includeCurrencySymbol ? formatAmount(value, currency) : value.toFixed(2);
}

export function exportToCsv(
  transactions: Transaction[],
  options: ExportOptions,
  fileName: string,
  currency: string | null = null
) {
  const sorted = sortByDate(transactions);

  // These columns are only included when at least one transaction actually
  // has data for them -- most statements won't have Value Date/Tran Type/
  // Tran ID/Cheque Details at all (confirmed via a real sample that some do),
  // so cluttering every export with empty columns for statements that don't
  // would be worse than just leaving them out entirely.
  const hasValueDate = sorted.some((t) => t.valueDate !== null);
  const hasTranType = sorted.some((t) => t.tranType !== null);
  const hasTranId = sorted.some((t) => t.tranId !== null);
  const hasChequeDetails = sorted.some((t) => t.chequeDetails !== null);

  const headers = ["Date"];
  if (hasValueDate) headers.push("Value Date");
  headers.push("Description");
  if (hasTranType) headers.push("Tran Type");
  if (hasTranId) headers.push("Tran ID");
  if (hasChequeDetails) headers.push("Cheque Details");
  if (options.splitDebitCredit) headers.push("Debit", "Credit");
  else headers.push("Amount");
  headers.push("Dr/Cr");
  if (options.includeBalance) headers.push("Balance");
  if (options.includeSourcePage) headers.push("Source Page");

  const lines = [headers.join(",")];

  for (const t of sorted) {
    const row: (string | number)[] = [t.date];
    if (hasValueDate) row.push(t.valueDate ?? "");
    row.push(t.description);
    if (hasTranType) row.push(t.tranType ?? "");
    if (hasTranId) row.push(t.tranId ?? "");
    if (hasChequeDetails) row.push(t.chequeDetails ?? "");
    if (options.splitDebitCredit) {
      row.push(t.amount < 0 ? fmt(Math.abs(t.amount), options, currency) : "", t.amount > 0 ? fmt(t.amount, options, currency) : "");
    } else {
      row.push(fmt(t.amount, options, currency));
    }
    row.push(t.drCr);
    if (options.includeBalance) row.push(t.balance !== null ? fmt(t.balance, options, currency) : "");
    if (options.includeSourcePage) row.push(t.sourcePage);
    lines.push(row.map(csvEscape).join(","));
  }

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, fileName);
}
