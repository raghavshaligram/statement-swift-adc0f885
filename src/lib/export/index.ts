import type { Transaction } from "../statement-store";
import { exportToXlsx } from "./to-xlsx";
import { exportToCsv } from "./to-csv";
import { exportToTallyXml } from "./to-tally-xml";
import { exportToOfx } from "./to-ofx";
import { exportToQif } from "./to-qif";
import { exportToQbo } from "./to-qbo";
import { exportToIif } from "./to-iif";
import { DEFAULT_EXPORT_OPTIONS, type ExportOptions } from "./types";
import { getConfidenceTier } from "../pdf/confidence";

export type ExportFormat = "xlsx" | "csv" | "tally" | "ofx" | "qif" | "qbo" | "iif";

export const FORMAT_EXTENSIONS: Record<ExportFormat, string> = {
  xlsx: ".xlsx",
  csv: ".csv",
  tally: ".xml",
  ofx: ".ofx",
  qif: ".qif",
  qbo: ".qbo",
  iif: ".iif",
};

export function runExport(
  format: ExportFormat,
  transactions: Transaction[],
  baseFileName: string,
  options: ExportOptions = DEFAULT_EXPORT_OPTIONS,
  oneSheetPerStatement = true,
  currency: string | null = null
) {
  const fileName = `${baseFileName}${FORMAT_EXTENSIONS[format]}`;
  // omitLowConfidence only affects which rows get included, applied uniformly
  // across every format -- filtered here once rather than in each exporter.
  const included = options.omitLowConfidence
    ? transactions.filter((t) => getConfidenceTier(t.confidence) !== "low")
    : transactions;

  switch (format) {
    case "xlsx":
      return exportToXlsx(included, options, fileName, oneSheetPerStatement, currency);
    case "csv":
      return exportToCsv(included, options, fileName, currency);
    case "tally":
      return exportToTallyXml(included, fileName);
    case "ofx":
      return exportToOfx(included, fileName);
    case "qif":
      return exportToQif(included, fileName);
    case "qbo":
      return exportToQbo(included, fileName);
    case "iif":
      return exportToIif(included, fileName);
  }
}

export type { ExportOptions };
export { DEFAULT_EXPORT_OPTIONS };
