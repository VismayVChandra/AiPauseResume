"use client";

import { useRef, useState } from "react";
import { ArrowRight, UploadCloud, FileText, ClipboardType, PencilLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RawProfile } from "@/types/resume";

type Method = "upload" | "paste" | "manual";

const TABS: { key: Method; label: string; Icon: typeof FileText }[] = [
  { key: "upload", label: "Upload PDF", Icon: FileText },
  { key: "paste", label: "Paste text", Icon: ClipboardType },
  { key: "manual", label: "Manual entry", Icon: PencilLine },
];

export function UploadStep({
  onExtracted,
  onSubmitFile,
  onDemo,
  onError,
  loading,
}: {
  onExtracted: (payload: { text?: string; manualProfile?: RawProfile }) => void;
  onSubmitFile: (file: File) => void;
  onDemo: () => void;
  onError: (msg: string) => void;
  loading: boolean;
}) {
  const [method, setMethod] = useState<Method>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [pasted, setPasted] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Compact manual-entry state — last resort when there's nothing to
  // upload or paste. Kept small on purpose.
  const [manual, setManual] = useState({
    fullName: "",
    headline: "",
    email: "",
    experienceText: "",
    skills: "",
    educationText: "",
  });

  function buildManualProfile(): RawProfile {
    const experience = manual.experienceText
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map((block) => {
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
        const [headerLine, ...bulletLines] = lines;
        const [titleCompany, dates] = (headerLine || "").split("|").map((s) => s?.trim());
        const [title, company] = (titleCompany || "").split("@").map((s) => s?.trim());
        return {
          title: title || headerLine || "Role",
          company: company || "",
          startDate: dates?.split("-")[0]?.trim(),
          endDate: dates?.split("-")[1]?.trim(),
          bullets: bulletLines,
        };
      });

    return {
      fullName: manual.fullName || "Your Name",
      headline: manual.headline,
      contact: { email: manual.email },
      experience,
      education: manual.educationText ? [{ institution: manual.educationText, degree: "" }] : [],
      projects: [],
      skills: manual.skills.split(",").map((s) => s.trim()).filter(Boolean),
      certifications: [],
    };
  }

  const ready =
    (method === "upload" && file) ||
    (method === "paste" && pasted.trim().length > 20) ||
    (method === "manual" && manual.fullName.trim().length > 0);

  const extractLabel = method === "manual" ? "Save my profile" : "Extract my profile";

  return (
    <div className="mx-auto max-w-2xl py-12 sm:py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-brand">Step 3 of 7</p>
      <h2 className="mt-3 font-serif text-3xl leading-tight tracking-tight text-foreground sm:text-4xl">
        Bring in your profile
      </h2>
      <p className="mt-3 text-base leading-relaxed text-muted-foreground">
        Import once and we&apos;ll pull in your experience, education, and skills. You can fix
        anything on the next step.
      </p>

      <div
        role="tablist"
        aria-label="Import method"
        className="mt-8 grid grid-cols-3 gap-1 rounded-xl border border-border bg-muted/60 p-1"
      >
        {TABS.map(({ key, label, Icon }) => {
          const active = method === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={active}
              onClick={() => setMethod(key)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 min-h-[240px]">
        {method === "upload" && (
          <div>
            {!file ? (
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) setFile(f);
                }}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors",
                  dragging
                    ? "border-brand bg-brand-muted/40"
                    : "border-border bg-card hover:border-brand/50 hover:bg-muted/40"
                )}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      if (f.type !== "application/pdf") {
                        onError("Please upload a PDF file (LinkedIn's 'More → Save to PDF' export).");
                        return;
                      }
                      setFile(f);
                    }
                  }}
                />
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-muted text-brand">
                  <UploadCloud className="h-6 w-6" strokeWidth={1.75} />
                </span>
                <span className="mt-4 text-sm font-medium text-foreground">
                  Drop your LinkedIn export or an existing resume PDF here, or click to choose
                </span>
                <span className="mt-1 text-xs text-muted-foreground">PDF up to 8 MB</span>
              </label>
            ) : (
              <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-muted text-brand">
                    <FileText className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <div>
                    <div className="text-sm font-medium text-foreground">{file.name}</div>
                    <div className="text-xs text-muted-foreground">Ready to extract</div>
                  </div>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="mt-4 rounded-lg border border-border bg-muted/40 p-4">
              <p className="text-xs font-medium text-foreground">How to find/export your LinkedIn PDF</p>
              <ol className="mt-2 flex flex-col gap-1 text-xs leading-relaxed text-muted-foreground">
                <li>
                  1. Go to{" "}
                  <a
                    href="https://www.linkedin.com/in/me/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand underline underline-offset-2"
                  >
                    linkedin.com/in/me
                  </a>{" "}
                  — this opens your own profile while you&apos;re signed in.
                </li>
                <li>
                  2. Click <span className="text-foreground">More</span> (below your profile
                  photo) → <span className="text-foreground">Save to PDF</span>.
                </li>
                <li>3. It downloads straight to your device — upload that file here.</li>
              </ol>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Don&apos;t have a LinkedIn PDF handy, or just want to try it out? You can also
                upload an existing resume — any PDF works — and we&apos;ll extract from that
                instead. Or use{" "}
                <span className="text-foreground">&quot;Try a demo profile instead&quot;</span>{" "}
                below to test the app with no file at all.
              </p>
            </div>
          </div>
        )}

        {method === "paste" && (
          <div>
            <label htmlFor="paste-profile" className="sr-only">
              Paste your profile text
            </label>
            <textarea
              id="paste-profile"
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              rows={9}
              placeholder="Paste your LinkedIn 'About', experience, and education here…"
              className="w-full resize-none rounded-xl border border-border bg-card p-4 text-sm leading-relaxed text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/15"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Rough and unformatted is fine — we&apos;ll structure it for you.
            </p>
          </div>
        )}

        {method === "manual" && (
          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <div className="grid grid-cols-2 gap-3">
              <input
                className="rounded-md border border-border bg-background p-2 text-sm outline-none focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/15"
                placeholder="Full name"
                value={manual.fullName}
                onChange={(e) => setManual({ ...manual, fullName: e.target.value })}
              />
              <input
                className="rounded-md border border-border bg-background p-2 text-sm outline-none focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/15"
                placeholder="Email"
                value={manual.email}
                onChange={(e) => setManual({ ...manual, email: e.target.value })}
              />
            </div>
            <input
              className="w-full rounded-md border border-border bg-background p-2 text-sm outline-none focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/15"
              placeholder="Headline (e.g. Software Engineer)"
              value={manual.headline}
              onChange={(e) => setManual({ ...manual, headline: e.target.value })}
            />
            <textarea
              className="w-full min-h-[130px] rounded-md border border-border bg-background p-2 text-sm outline-none focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/15"
              placeholder={
                "One role per block, separated by a blank line. First line: Title @ Company | Start - End\nThen bullet points, one per line."
              }
              value={manual.experienceText}
              onChange={(e) => setManual({ ...manual, experienceText: e.target.value })}
            />
            <input
              className="w-full rounded-md border border-border bg-background p-2 text-sm outline-none focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/15"
              placeholder="Skills, comma separated"
              value={manual.skills}
              onChange={(e) => setManual({ ...manual, skills: e.target.value })}
            />
            <input
              className="w-full rounded-md border border-border bg-background p-2 text-sm outline-none focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/15"
              placeholder="Education (school, degree)"
              value={manual.educationText}
              onChange={(e) => setManual({ ...manual, educationText: e.target.value })}
            />
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col-reverse items-center justify-between gap-4 sm:flex-row">
        <button
          onClick={onDemo}
          disabled={loading}
          className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-brand hover:underline disabled:opacity-40"
        >
          Try a demo profile instead
        </button>

        <Button
          size="lg"
          disabled={!ready || loading}
          onClick={() => {
            if (method === "upload") {
              if (!file) return onError("Choose a PDF file first.");
              onSubmitFile(file);
            } else if (method === "paste") {
              if (pasted.trim().length < 20)
                return onError("Paste a bit more profile text — that looked too short.");
              onExtracted({ text: pasted.trim() });
            } else {
              if (!manual.fullName.trim()) return onError("Enter at least your name.");
              onExtracted({ manualProfile: buildManualProfile() });
            }
          }}
        >
          {loading ? "Processing…" : extractLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
