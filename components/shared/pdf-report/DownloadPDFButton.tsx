"use client";

import { useState } from "react";
import { Download } from "lucide-react";

type CheckItem = {
  id: string;
  label: string;
  score?: number;
  status: string;
  details?: string;
  recommendation?: string;
  actionItems?: string[];
};

type Props = {
  url: string;
  overallScore: number;
  checks: CheckItem[];
  aiChecks?: CheckItem[];
};

export default function DownloadPDFButton({ url, overallScore, checks, aiChecks = [] }: Props) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      // Dynamic import to avoid SSR issues
      const [{ pdf }, { default: PDFReport }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./PDFReport"),
      ]);

      const blob = await pdf(
        <PDFReport
          url={url}
          overallScore={overallScore}
          checks={checks}
          aiChecks={aiChecks}
        />
      ).toBlob();

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      const hostname = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
      link.download = `ai-analyse-${hostname}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="flex items-center gap-8 px-20 py-10 bg-accent-white border border-black-alpha-8 hover:bg-black-alpha-4 rounded-8 text-label-medium transition-all disabled:opacity-50"
    >
      <Download className={`w-16 h-16 ${loading ? "animate-bounce" : ""}`} />
      {loading ? "Genererer…" : "Download rapport"}
    </button>
  );
}
