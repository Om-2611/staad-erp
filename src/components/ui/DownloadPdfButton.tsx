"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface PdfSection {
  heading: string;
  columns: string[];
  rows: (string | number)[][];
}

export interface PdfStat {
  label: string;
  value: string | number;
}

interface DownloadPdfButtonProps {
  filename: string;
  title: string;
  /** Short lines under the title — active filters, e.g. "Team: AI", "1 Jan – 31 Jan 2026". */
  meta?: string[];
  /** A row of headline numbers rendered as a summary strip. */
  stats?: PdfStat[];
  /** One or more tables, each with its own heading. */
  sections: PdfSection[];
  disabled?: boolean;
  label?: string;
}

/**
 * Renders the given data into a PDF entirely client-side (jsPDF +
 * jspdf-autotable) and triggers a download — no server round-trip, so it
 * costs nothing on a free-tier deploy. Used across the viewer portal so
 * leadership can export whatever they're currently looking at (already
 * filtered by date range / team / intern) as a shareable report.
 */
export function DownloadPdfButton({
  filename,
  title,
  meta = [],
  stats = [],
  sections,
  disabled,
  label = "Download PDF",
}: DownloadPdfButtonProps) {
  const [busy, setBusy] = useState(false);

  async function handleDownload() {
    setBusy(true);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const marginX = 40;
      let y = 50;

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(title, marginX, y);
      y += 20;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(`Generated ${new Date().toLocaleString()}`, marginX, y);
      y += 16;

      if (meta.length) {
        doc.setTextColor(60);
        for (const line of meta) {
          doc.text(line, marginX, y);
          y += 14;
        }
        y += 4;
      }

      if (stats.length) {
        const colWidth = (pageWidth - marginX * 2) / stats.length;
        doc.setDrawColor(220);
        doc.line(marginX, y, pageWidth - marginX, y);
        y += 18;
        stats.forEach((s, i) => {
          const x = marginX + i * colWidth;
          doc.setFontSize(14);
          doc.setTextColor(30);
          doc.setFont("helvetica", "bold");
          doc.text(String(s.value), x, y);
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(120);
          doc.text(s.label.toUpperCase(), x, y + 12);
        });
        y += 30;
      }

      for (const section of sections) {
        if (y > doc.internal.pageSize.getHeight() - 100) {
          doc.addPage();
          y = 50;
        }
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30);
        doc.text(section.heading, marginX, y);
        y += 8;

        autoTable(doc, {
          startY: y,
          head: [section.columns],
          body: section.rows.length ? section.rows : [["—", ...Array(Math.max(section.columns.length - 1, 0)).fill("")]],
          margin: { left: marginX, right: marginX },
          styles: { fontSize: 9, cellPadding: 5 },
          headStyles: { fillColor: [79, 70, 229], textColor: 255 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        y = (doc as any).lastAutoTable.finalY + 24;
      }

      doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" variant="secondary" size="sm" onClick={handleDownload} disabled={disabled || busy}>
      <FileDown className="h-3.5 w-3.5" />
      {busy ? "Generating…" : label}
    </Button>
  );
}
