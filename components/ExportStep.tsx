"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Download, FileText, FileType2, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TailoredResume, TEMPLATE_OPTIONS } from "@/types/resume";
import { cn } from "@/lib/utils";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ExportStep({
  resume,
  onChangeTemplate,
  onBack,
}: {
  resume: TailoredResume;
  onChangeTemplate: (templateId: TailoredResume["templateId"]) => void;
  onBack: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<"pdf" | "docx" | null>(null);
  const [downloaded, setDownloaded] = useState<null | "pdf" | "docx">(null);
  const objectUrlRef = useRef<string | null>(null);

  const base = (resume.fullName || "resume").trim().replace(/\s+/g, "_") || "resume";

  // This is the literal PDF that would download — not an approximation —
  // so what the user sees here is exactly what they'll get.
  async function generatePreview() {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const res = await fetch("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume }),
      });
      if (!res.ok) throw new Error("Couldn't generate a preview.");
      const blob = await res.blob();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      setPreviewUrl(url);
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : "Couldn't generate a preview.");
    } finally {
      setPreviewLoading(false);
    }
  }

  // Auto-generate on first arrival at this step, and again whenever the
  // template changes — content edits (from the review step) don't
  // auto-regenerate since that would mean a fetch per keystroke; there's a
  // manual "Refresh preview" button for after template changes made here.
  useEffect(() => {
    generatePreview();
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume.templateId]);

  async function handleDownloadPdf() {
    setDownloading("pdf");
    try {
      const res = await fetch("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume }),
      });
      if (!res.ok) throw new Error("Export failed.");
      const blob = await res.blob();
      downloadBlob(blob, `${base}.pdf`);
      setDownloaded("pdf");
    } catch {
      setPreviewError("Couldn't generate the PDF. Try again.");
    } finally {
      setDownloading(null);
    }
  }

  async function handleDownloadDocx() {
    setDownloading("docx");
    try {
      const res = await fetch("/api/export-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume }),
      });
      if (!res.ok) throw new Error("Export failed.");
      const blob = await res.blob();
      downloadBlob(blob, `${base}.docx`);
      setDownloaded("docx");
    } catch {
      setPreviewError("Couldn't generate the DOCX. Try again.");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl py-10 sm:py-14">
      <p className="font-mono text-xs uppercase tracking-widest text-brand">Step 7 of 7</p>
      <h2 className="mt-3 font-serif text-3xl leading-tight tracking-tight text-foreground sm:text-4xl">
        Preview &amp; export
      </h2>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
        This is the exact PDF you&apos;d download — check it over, switch templates if you like,
        then export. Nothing is final until you download.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px] lg:items-start">
        {/* live preview of the real PDF */}
        <div className="order-2 lg:order-1">
          <div className="overflow-hidden rounded-2xl border border-border bg-paper-edge/30 p-3 sm:p-4">
            {previewLoading && (
              <div className="flex h-[600px] items-center justify-center text-sm text-muted-foreground">
                Generating preview…
              </div>
            )}
            {!previewLoading && previewError && (
              <div className="flex h-[600px] flex-col items-center justify-center gap-3 text-sm text-destructive">
                {previewError}
                <Button variant="outline" size="sm" onClick={generatePreview}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Try again
                </Button>
              </div>
            )}
            {!previewLoading && !previewError && previewUrl && (
              <iframe
                title="Resume preview"
                src={previewUrl}
                className="h-[800px] w-full rounded-lg border border-border bg-white"
              />
            )}
          </div>
        </div>

        {/* actions */}
        <aside className="order-1 flex flex-col gap-4 lg:order-2 lg:sticky lg:top-24">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-medium text-foreground">Template</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TEMPLATE_OPTIONS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onChangeTemplate(t.id)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                    resume.templateId === t.id
                      ? "border-brand bg-brand-muted/50 text-brand"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-medium text-foreground">Download</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Pick a format. PDF is best for applications; DOCX if a portal asks for an editable
              file.
            </p>

            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={handleDownloadPdf}
                disabled={downloading !== null}
                className="group flex items-center gap-3 rounded-lg border border-brand/25 bg-brand-muted/40 px-4 py-3 text-left transition-colors hover:bg-brand-muted/70 disabled:opacity-60"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-brand-foreground">
                  <FileText className="h-4.5 w-4.5" strokeWidth={2} />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium text-foreground">
                    {downloading === "pdf" ? "Generating…" : "Download PDF"}
                  </span>
                  <span className="block text-xs text-muted-foreground">Recommended</span>
                </span>
                {downloaded === "pdf" ? (
                  <Check className="h-4 w-4 text-brand" />
                ) : (
                  <Download className="h-4 w-4 text-brand" />
                )}
              </button>

              <button
                onClick={handleDownloadDocx}
                disabled={downloading !== null}
                className="group flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-left transition-colors hover:bg-muted disabled:opacity-60"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground">
                  <FileType2 className="h-4.5 w-4.5" strokeWidth={2} />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium text-foreground">
                    {downloading === "docx" ? "Generating…" : "Download DOCX"}
                  </span>
                  <span className="block text-xs text-muted-foreground">Editable in Word</span>
                </span>
                {downloaded === "docx" ? (
                  <Check className="h-4 w-4 text-brand" />
                ) : (
                  <Download className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>

            {downloaded && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-brand">
                <Check className="h-3.5 w-3.5" />
                Saved to your downloads.
              </p>
            )}
          </div>

          <Button variant="ghost" onClick={onBack} className="gap-2 self-start text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to interview prep
          </Button>
        </aside>
      </div>
    </div>
  );
}
