"use client";

import { useState } from "react";
import { Wand2, FileText, FileType2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CoverLetter, TailoredResume } from "@/types/resume";

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

// Self-contained like the other export-screen panels (Template, Download):
// owns its own fetches for generate/export, and reports edits up via
// onChange so the parent can persist them alongside the resume.
export function CoverLetterPanel({
  resume,
  coverLetter,
  onChange,
}: {
  resume: TailoredResume;
  coverLetter: CoverLetter | null;
  onChange: (letter: CoverLetter) => void;
}) {
  const [letter, setLetter] = useState<CoverLetter | null>(coverLetter);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<"pdf" | "docx" | null>(null);

  const base = (resume.fullName || "cover_letter").trim().replace(/\s+/g, "_") || "cover_letter";

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't generate a cover letter.");
      setLetter(json.coverLetter);
      onChange(json.coverLetter);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't generate a cover letter.");
    } finally {
      setGenerating(false);
    }
  }

  function update(patch: Partial<CoverLetter>) {
    if (!letter) return;
    const next = { ...letter, ...patch };
    setLetter(next);
    onChange(next);
  }

  async function download(format: "pdf" | "docx") {
    if (!letter) return;
    setDownloading(format);
    setError(null);
    try {
      const res = await fetch(`/api/export-cover-letter-${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, coverLetter: letter }),
      });
      if (!res.ok) throw new Error("Export failed.");
      const blob = await res.blob();
      downloadBlob(blob, `${base}_cover_letter.${format}`);
    } catch {
      setError(`Couldn't generate the ${format.toUpperCase()}. Try again.`);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Cover letter</h3>
        {letter && (
          <button
            onClick={generate}
            disabled={generating}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-brand disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3 w-3", generating && "animate-spin")} />
            Regenerate
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      {!letter && (
        <>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Grounded only in what&apos;s on this resume — nothing invented.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={generate}
            disabled={generating}
            className="mt-3 w-full gap-2"
          >
            <Wand2 className="h-3.5 w-3.5" />
            {generating ? "Writing…" : "Generate cover letter"}
          </Button>
        </>
      )}

      {letter && (
        <div className="mt-3 flex flex-col gap-2.5">
          <input
            type="text"
            value={letter.greeting}
            onChange={(e) => update({ greeting: e.target.value })}
            aria-label="Greeting"
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/15"
          />
          <textarea
            value={letter.paragraphs.join("\n\n")}
            onChange={(e) =>
              update({
                paragraphs: e.target.value
                  .split(/\n\s*\n/)
                  .map((p) => p.trim())
                  .filter(Boolean),
              })
            }
            aria-label="Cover letter body"
            rows={10}
            className="w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-xs leading-relaxed outline-none focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/15"
          />
          <input
            type="text"
            value={letter.signOff}
            onChange={(e) => update({ signOff: e.target.value })}
            aria-label="Sign-off"
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/15"
          />

          <div className="mt-1 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => download("pdf")}
              disabled={downloading !== null}
              className="flex-1 gap-1.5"
            >
              <FileText className="h-3.5 w-3.5" />
              {downloading === "pdf" ? "Generating…" : "PDF"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => download("docx")}
              disabled={downloading !== null}
              className="flex-1 gap-1.5"
            >
              <FileType2 className="h-3.5 w-3.5" />
              {downloading === "docx" ? "Generating…" : "DOCX"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
