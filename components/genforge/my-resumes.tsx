"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Plus, FileText, Loader2, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAccessToken } from "@/lib/supabase";
import { APPLICATION_STATUS_OPTIONS, ApplicationStatus } from "@/types/resume";
import { cn } from "@/lib/utils";

export interface SavedResumeSummary {
  resumeId: string;
  careerProfileId: string;
  targetRole: string;
  fullName: string;
  templateId: string;
  updatedAt: string;
  isPublic: boolean;
  applicationStatus: string;
  companyName: string;
  appliedAt: string;
  personaLabel: string;
}

const STATUS_TONE: Record<string, string> = {
  not_applied: "bg-muted text-muted-foreground",
  applied: "bg-blue-50 text-blue-700",
  interviewing: "bg-amber-50 text-amber-800",
  offer: "bg-brand-muted/60 text-brand",
  rejected: "bg-destructive/10 text-destructive",
};

export function MyResumesView({
  onOpen,
  onNew,
  onRetailor,
}: {
  onOpen: (summary: SavedResumeSummary) => void;
  onNew: () => void;
  onRetailor?: (summary: SavedResumeSummary) => void;
}) {
  const [resumes, setResumes] = useState<SavedResumeSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(resumeId: string, status: ApplicationStatus) {
    setResumes((prev) =>
      prev ? prev.map((r) => (r.resumeId === resumeId ? { ...r, applicationStatus: status } : r)) : prev
    );
    try {
      const token = await getAccessToken();
      if (!token) return;
      await fetch(`/api/resumes/${resumeId}/tracker`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
    } catch {
      // best-effort — status stays updated locally even if the write failed
    }
  }

  async function updateCompany(resumeId: string, companyName: string) {
    setResumes((prev) =>
      prev ? prev.map((r) => (r.resumeId === resumeId ? { ...r, companyName } : r)) : prev
    );
    try {
      const token = await getAccessToken();
      if (!token) return;
      await fetch(`/api/resumes/${resumeId}/tracker`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ companyName: companyName || null }),
      });
    } catch {
      // best-effort
    }
  }

  async function updatePersonaLabel(resumeId: string, personaLabel: string) {
    setResumes((prev) =>
      prev ? prev.map((r) => (r.resumeId === resumeId ? { ...r, personaLabel } : r)) : prev
    );
    try {
      const token = await getAccessToken();
      if (!token) return;
      await fetch(`/api/resumes/${resumeId}/tracker`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ personaLabel: personaLabel || null }),
      });
    } catch {
      // best-effort
    }
  }

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
            <li
              key={r.resumeId}
              className="flex flex-col items-start gap-1 rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-brand/40 hover:shadow-sm"
            >
              <input
                type="text"
                defaultValue={r.personaLabel}
                onBlur={(e) => {
                  if (e.target.value !== r.personaLabel) updatePersonaLabel(r.resumeId, e.target.value);
                }}
                placeholder={`Label this version (e.g. "IC track")`}
                aria-label="Persona label"
                className="w-full rounded-md bg-transparent px-0 py-0.5 text-sm font-semibold text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-brand/20"
              />
              <button onClick={() => onOpen(r)} className="w-full text-left">
                <span className="text-xs text-muted-foreground">{r.fullName}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Targeting {r.targetRole || "—"}
                </span>
                <span className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="rounded-full border border-border px-2 py-0.5 capitalize">
                    {r.templateId}
                  </span>
                  Updated {new Date(r.updatedAt).toLocaleDateString()}
                </span>
              </button>
              <div className="mt-3 flex w-full flex-wrap items-center gap-2">
                <select
                  value={r.applicationStatus}
                  onChange={(e) => updateStatus(r.resumeId, e.target.value as ApplicationStatus)}
                  aria-label="Application status"
                  className={cn(
                    "rounded-full border-0 px-2.5 py-1 text-[11px] font-medium outline-none",
                    STATUS_TONE[r.applicationStatus] || STATUS_TONE.not_applied
                  )}
                >
                  {APPLICATION_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  defaultValue={r.companyName}
                  onBlur={(e) => {
                    if (e.target.value !== r.companyName) updateCompany(r.resumeId, e.target.value);
                  }}
                  placeholder="Company (optional)"
                  aria-label="Company applied to"
                  className="min-w-0 flex-1 rounded-md border border-dashed border-border bg-transparent px-2 py-1 text-[11px] text-foreground outline-none placeholder:text-muted-foreground/60 focus-visible:border-brand"
                />
              </div>

              {onRetailor && (
                <button
                  onClick={() => onRetailor(r)}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-brand transition-colors hover:bg-brand-muted/50"
                >
                  <Repeat className="h-3 w-3" />
                  Tailor for another role
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
