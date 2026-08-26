"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Download,
  FileText,
  FileType2,
  Check,
  RefreshCw,
  Repeat,
  RotateCcw,
  Scissors,
  Layers,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CoverLetterPanel } from "@/components/genforge/cover-letter-panel";
import { ShareLinkPanel } from "@/components/genforge/share-link-panel";
import { LinkedInOptimizerPanel } from "@/components/genforge/linkedin-optimizer-panel";
import { CoverLetter, TailoredResume, TEMPLATE_OPTIONS } from "@/types/resume";
import { cn } from "@/lib/utils";

// These two templates are deliberately colorless (max ATS compatibility) —
// same rule the PDF/DOCX renderers apply when deciding whether to read
// resume.accentColor at all.
const NO_ACCENT_TEMPLATES = new Set(["classic", "compact"]);

const ACCENT_PRESETS = [
  { label: "Blue", value: "#2563eb" },
  { label: "Teal", value: "#0d9488" },
  { label: "Purple", value: "#7c3aed" },
  { label: "Rose", value: "#e11d48" },
  { label: "Amber", value: "#d97706" },
  { label: "Green", value: "#16a34a" },
  { label: "Slate", value: "#334155" },
];

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
  resumeId,
  coverLetter,
  onCoverLetterChange,
  onChangeTemplate,
  onChangeAccentColor,
  onCondensed,
  onBack,
  onTailorAnotherRole,
}: {
  resume: TailoredResume;
  resumeId: string | null;
  coverLetter: CoverLetter | null;
  onCoverLetterChange: (letter: CoverLetter) => void;
  onChangeTemplate: (templateId: TailoredResume["templateId"]) => void;
  onChangeAccentColor: (color: string | undefined) => void;
  onCondensed: (next: TailoredResume) => void;
  onBack: () => void;
  onTailorAnotherRole?: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [downloading, setDownloading] = useState<"pdf" | "docx" | "txt" | null>(null);
  const [downloaded, setDownloaded] = useState<null | "pdf" | "docx" | "txt">(null);
  const [condensing, setCondensing] = useState(false);
  const [condenseError, setCondenseError] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const base = (resume.fullName || "resume").trim().replace(/\s+/g, "_") || "resume";

  // This is the literal PDF that would download — not an approximation —
  // so what the user sees here is exactly what they'll get. The page count
  // comes from the same response (an X-Resume-Pages header set by parsing
  // the rendered PDF server-side), not an estimate.
  async function generatePreview(overrideResume?: TailoredResume) {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const res = await fetch("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: overrideResume || resume }),
      });
      if (!res.ok) throw new Error("Couldn't generate a preview.");
      const pages = res.headers.get("X-Resume-Pages");
      setPageCount(pages ? Number(pages) : null);
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

  async function handleCondense() {
    setCondensing(true);
    setCondenseError(null);
    try {
      const res = await fetch("/api/condense-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't condense this resume.");
      const condensed = json.resume as TailoredResume;
      onCondensed(condensed);
      // Refresh the preview/page-count with the just-condensed data directly
      // — the auto-refresh effect below only watches templateId/accentColor,
      // and the `resume` prop here won't reflect this update until the
      // parent re-renders, so passing it explicitly avoids a stale preview.
      await generatePreview(condensed);
    } catch (e) {
      setCondenseError(e instanceof Error ? e.message : "Couldn't condense this resume.");
    } finally {
      setCondensing(false);
    }
  }

  // Auto-generate on first arrival at this step, and again whenever the
  // template or accent color changes — content edits (from the review
  // step) don't auto-regenerate since that would mean a fetch per
  // keystroke; there's a manual "Refresh preview" button for those.
  useEffect(() => {
    generatePreview();
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume.templateId, resume.accentColor]);

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

  async function handleDownloadTxt() {
    setDownloading("txt");
    try {
      const res = await fetch("/api/export-txt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume }),
      });
      if (!res.ok) throw new Error("Export failed.");
      const blob = await res.blob();
      downloadBlob(blob, `${base}.txt`);
      setDownloaded("txt");
    } catch {
      setPreviewError("Couldn't generate the plain-text export. Try again.");
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
          {pageCount !== null && !previewLoading && (
            <div className="mb-2 flex items-center justify-between">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                  pageCount > 1
                    ? "bg-amber-50 text-amber-800"
                    : "bg-brand-muted/50 text-brand"
                )}
              >
                <Layers className="h-3 w-3" />
                {pageCount} {pageCount === 1 ? "page" : "pages"}
              </span>
            </div>
          )}
          <div className="overflow-hidden rounded-2xl border border-border bg-paper-edge/30 p-3 sm:p-4">
            {previewLoading && (
              <div className="flex h-[600px] items-center justify-center text-sm text-muted-foreground">
                Generating preview…
              </div>
            )}
            {!previewLoading && previewError && (
              <div className="flex h-[600px] flex-col items-center justify-center gap-3 text-sm text-destructive">
                {previewError}
                <Button variant="outline" size="sm" onClick={() => generatePreview()}>
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

            {!NO_ACCENT_TEMPLATES.has(resume.templateId) && (
              <div className="mt-4 border-t border-border pt-4">
                <h4 className="text-xs font-medium text-foreground">Accent color</h4>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {ACCENT_PRESETS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => onChangeAccentColor(c.value)}
                      aria-label={c.label}
                      title={c.label}
                      className={cn(
                        "h-6 w-6 rounded-full border-2 transition-transform hover:scale-110",
                        resume.accentColor === c.value ? "border-foreground" : "border-transparent"
                      )}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                  <button
                    onClick={() => onChangeAccentColor(undefined)}
                    aria-label="Reset to default color"
                    title="Reset to default"
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full border transition-colors",
                      !resume.accentColor
                        ? "border-foreground text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {pageCount !== null && pageCount > 1 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="flex items-center gap-1.5 text-sm font-medium text-amber-900">
                <Scissors className="h-4 w-4" />
                Runs to {pageCount} pages
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-amber-800">
                Tighten wording and trim the least-relevant bullet or two to fit one page — never
                adds anything, only shortens what&apos;s already there.
              </p>
              {condenseError && <p className="mt-2 text-xs text-destructive">{condenseError}</p>}
              <Button
                size="sm"
                onClick={handleCondense}
                disabled={condensing}
                className="mt-3 w-full gap-1.5"
              >
                <Scissors className="h-3.5 w-3.5" />
                {condensing ? "Condensing…" : "Condense to one page"}
              </Button>
            </div>
          )}

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

              <button
                onClick={handleDownloadTxt}
                disabled={downloading !== null}
                className="group flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-left transition-colors hover:bg-muted disabled:opacity-60"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground">
                  <Type className="h-4.5 w-4.5" strokeWidth={2} />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium text-foreground">
                    {downloading === "txt" ? "Generating…" : "Download TXT"}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Plain text, for ATS paste boxes
                  </span>
                </span>
                {downloaded === "txt" ? (
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

          <CoverLetterPanel
            resume={resume}
            coverLetter={coverLetter}
            onChange={onCoverLetterChange}
          />

          <LinkedInOptimizerPanel resume={resume} />

          <ShareLinkPanel resumeId={resumeId} />

          {onTailorAnotherRole && (
            <button
              onClick={onTailorAnotherRole}
              className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-card px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand"
            >
              <Repeat className="h-4 w-4 shrink-0" />
              Tailor this profile for another role
            </button>
          )}

          <Button variant="ghost" onClick={onBack} className="gap-2 self-start text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to interview prep
          </Button>
        </aside>
      </div>
    </div>
  );
}
