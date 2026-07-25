import { createFileRoute } from "@tanstack/react-router";
import { FormatConverterPage } from "@/components/format-converter-page";

const FAQ = [
  {
    q: "What software imports OFX files?",
    a: "Most accounting and personal-finance software — QuickBooks, Quicken, and many banks' own import tools — accepts OFX (Open Financial Exchange) as a standard transaction-import format.",
  },
  {
    q: "What kind of CSV works?",
    a: "Any CSV with a date, a description, and an amount column. Headers are detected automatically — no fixed template to match.",
  },
  {
    q: "Does this cost anything?",
    a: "No. Structured file conversions like this are free and unlimited — there's no OCR involved, so there's no reason to gate it the way PDF/photo conversion is.",
  },
  {
    q: "Is my data uploaded anywhere?",
    a: "No. The conversion runs entirely in your browser — nothing is sent to a server.",
  },
];

export const Route = createFileRoute("/csv-to-ofx")({
  head: () => ({
    meta: [
      { title: "CSV to OFX Converter — Free, On-Device — LedgerLocal" },
      {
        name: "description",
        content: "Convert any CSV to OFX for QuickBooks or Quicken import. Free, unlimited, nothing uploaded — runs entirely in your browser.",
      },
    ],
  }),
  component: () => (
    <FormatConverterPage
      title="CSV to OFX Converter"
      intro="Convert any CSV file to OFX — free, unlimited, and entirely on your device."
      freeNote="Free and unlimited — no OCR involved, no page limits"
      steps={[
        "Drop your CSV file — headers are detected automatically, whatever the source.",
        "LedgerLocal reads the date, description, and amount columns and builds a standard OFX transaction list.",
        "Export the .ofx file and import it into your accounting or finance software.",
      ]}
      ctaLabel="Convert a CSV to OFX"
      faq={FAQ}
    />
  ),
});
