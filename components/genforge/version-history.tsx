"use client";

import { useState } from "react";
import { History, Loader2, RotateCcw } from "lucide-react";
import { ResumeVersion, TailoredResume } from "@/types/resume";

// Lists checkpoint snapshots for the current resume (initial tailor, right
// before each AI improvement) and lets the user jump back to one. Loaded
// lazily on open rather than on every render of the review screen.
export function VersionHistory({
  resumeId,
  onRestore,
}: {
  resumeId: string | null;
  onRestore: (resume: TailoredResume) => void;
}) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<ResumeVersion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (versions || !resumeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/resumes/${resumeId}/versions`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't load version history.");
      setVersions(json.versions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load version history.");
    } finally {
      setLoading(false);
    }
  }

  if (!resumeId) return null;

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <History className="h-3.5 w-3.5" />
        Version history
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-30 w-80 rounded-xl border border-border bg-card p-3 shadow-lg">
          {loading && (
            <div className="flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading versions…
            </div>
          )}
          {error && <p className="px-2 py-2 text-xs text-destructive">{error}</p>}
          {versions && versions.length === 0 && (
            <p className="px-2 py-2 text-xs text-muted-foreground">No earlier versions yet.</p>
          )}
          {versions && versions.length > 0 && (
            <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
              {versions.map((v) => (
                <li key={v.id}>
                  <button
                    onClick={() => {
                      onRestore(v.resume);
                      setOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-xs transition-colors hover:bg-muted"
                  >
                    <span>
                      <span className="block font-medium text-foreground">{v.label}</span>
                      <span className="block text-muted-foreground">
                        {new Date(v.createdAt).toLocaleString()}
                      </span>
                    </span>
                    <RotateCcw className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
