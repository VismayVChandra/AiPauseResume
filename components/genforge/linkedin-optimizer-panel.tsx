"use client";

import { useState } from "react";
import { Linkedin, Wand2, Copy, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkedInOptimization, TailoredResume } from "@/types/resume";

// Self-contained, same pattern as the Cover letter panel — generates from
// the tailored resume already on screen, no separate profile fetch needed.
export function LinkedInOptimizerPanel({ resume }: { resume: TailoredResume }) {
  const [optimization, setOptimization] = useState<LinkedInOptimization | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"headline" | "about" | null>(null);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/linkedin-optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't generate LinkedIn copy.");
      setOptimization(json.optimization);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't generate LinkedIn copy.");
    } finally {
      setGenerating(false);
    }
  }

  async function copy(field: "headline" | "about", text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Linkedin className="h-4 w-4 text-linkedin" />
          LinkedIn optimizer
        </h3>
        {optimization && (
          <button
            onClick={generate}
            disabled={generating}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-brand disabled:opacity-50"
          >
            <RefreshCw className={generating ? "h-3 w-3 animate-spin" : "h-3 w-3"} />
            Regenerate
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      {!optimization && (
        <>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            A headline and About section for your LinkedIn profile, drawn from this resume.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={generate}
            disabled={generating}
            className="mt-3 w-full gap-2"
          >
            <Wand2 className="h-3.5 w-3.5" />
            {generating ? "Writing…" : "Generate LinkedIn copy"}
          </Button>
        </>
      )}

      {optimization && (
        <div className="mt-3 flex flex-col gap-3">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Headline
              </label>
              <button
                onClick={() => copy("headline", optimization.headline)}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-brand"
              >
                {copied === "headline" ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                Copy
              </button>
            </div>
            <p className="rounded-md border border-border bg-background px-2.5 py-2 text-xs leading-relaxed text-foreground">
              {optimization.headline}
            </p>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                About
              </label>
              <button
                onClick={() => copy("about", optimization.about)}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-brand"
              >
                {copied === "about" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                Copy
              </button>
            </div>
            <p className="whitespace-pre-line rounded-md border border-border bg-background px-2.5 py-2 text-xs leading-relaxed text-foreground">
              {optimization.about}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
