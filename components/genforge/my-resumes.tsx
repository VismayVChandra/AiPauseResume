"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Plus, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAccessToken } from "@/lib/supabase";

export interface SavedResumeSummary {
  resumeId: string;
  careerProfileId: string;
  targetRole: string;
  fullName: string;
  templateId: string;
  updatedAt: string;
}

export function MyResumesView({
  onOpen,
  onNew,
}: {
  onOpen: (summary: SavedResumeSummary) => void;
  onNew: () => void;
}) {
  const [resumes, setResumes] = useState<SavedResumeSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) throw new Error("Not signed in.");
        const res = await fetch("/api/my-resumes", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Couldn't load your resumes.");
        setResumes(json.resumes);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't load your resumes.");
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-4xl py-10 sm:py-14">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl leading-tight tracking-tight text-foreground sm:text-4xl">
            My resumes
          </h2>
          <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
            Every version you&apos;ve saved, tailored to a different role. Open one to keep
            editing, or start fresh for a new application.
          </p>
        </div>
        <Button size="lg" onClick={onNew} className="gap-2">
          <Plus className="h-4 w-4" />
          New resume
        </Button>
      </div>

      {error && (
        <div className="mt-6 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {!resumes && !error && (
        <div className="mt-10 flex flex-col items-center gap-3 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-brand" />
          Loading your resumes…
        </div>
      )}

      {resumes && resumes.length === 0 && (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <FileText className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nothing saved yet — build a resume and choose to save it when you export.
          </p>
          <Button onClick={onNew} className="mt-2 gap-2">
            Build my first resume
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {resumes && resumes.length > 0 && (
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {resumes.map((r) => (
            <li key={r.resumeId}>
              <button
                onClick={() => onOpen(r)}
                className="flex w-full flex-col items-start gap-1 rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-brand/40 hover:shadow-sm"
              >
                <span className="text-sm font-medium text-foreground">{r.fullName}</span>
                <span className="text-xs text-muted-foreground">
                  Targeting {r.targetRole || "—"}
                </span>
                <span className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="rounded-full border border-border px-2 py-0.5 capitalize">
                    {r.templateId}
                  </span>
                  Updated {new Date(r.updatedAt).toLocaleDateString()}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
