"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Plus, FileText, Loader2, Repeat, Tag, Globe, Search } from "lucide-react";
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

// One tone per status, used consistently across the filter chips, the
// card's left accent stripe, and the status pill itself — so a colour
// means the same thing everywhere on this screen.
const STATUS_TONE: Record<string, { pill: string; stripe: string; chip: string }> = {
  not_applied: {
    pill: "bg-muted text-muted-foreground",
    stripe: "bg-border",
    chip: "border-border text-muted-foreground",
  },
  applied: {
    pill: "bg-blue-50 text-blue-700",
    stripe: "bg-blue-400",
    chip: "border-blue-200 bg-blue-50 text-blue-700",
  },
  interviewing: {
    pill: "bg-amber-50 text-amber-800",
    stripe: "bg-amber-400",
    chip: "border-amber-200 bg-amber-50 text-amber-800",
  },
  offer: {
    pill: "bg-brand-muted/60 text-brand",
    stripe: "bg-brand",
    chip: "border-brand/30 bg-brand-muted/50 text-brand",
  },
  rejected: {
    pill: "bg-destructive/10 text-destructive",
    stripe: "bg-destructive/50",
    chip: "border-destructive/25 bg-destructive/10 text-destructive",
  },
};

function toneFor(status: string) {
  return STATUS_TONE[status] || STATUS_TONE.not_applied;
}

function formatUpdated(iso: string): string {
  const then = new Date(iso);
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return then.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [query, setQuery] = useState("");

  async function patchTracker(resumeId: string, body: Record<string, unknown>) {
    try {
      const token = await getAccessToken();
      if (!token) return;
      await fetch(`/api/resumes/${resumeId}/tracker`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
    } catch {
      // best-effort — the optimistic local update stands either way
    }
  }

  function patchLocal(resumeId: string, patch: Partial<SavedResumeSummary>) {
    setResumes((prev) =>
      prev ? prev.map((r) => (r.resumeId === resumeId ? { ...r, ...patch } : r)) : prev
    );
  }

  function updateStatus(resumeId: string, status: ApplicationStatus) {
    patchLocal(resumeId, { applicationStatus: status });
    patchTracker(resumeId, { status });
  }

  function updateCompany(resumeId: string, companyName: string) {
    patchLocal(resumeId, { companyName });
    patchTracker(resumeId, { companyName: companyName || null });
  }

  function updatePersonaLabel(resumeId: string, personaLabel: string) {
    patchLocal(resumeId, { personaLabel });
    patchTracker(resumeId, { personaLabel: personaLabel || null });
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

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: resumes?.length ?? 0 };
    for (const r of resumes || []) {
      map[r.applicationStatus] = (map[r.applicationStatus] || 0) + 1;
    }
    return map;
  }, [resumes]);

  const visible = useMemo(() => {
    let list = resumes || [];
    if (statusFilter !== "all") list = list.filter((r) => r.applicationStatus === statusFilter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((r) =>
        [r.personaLabel, r.targetRole, r.companyName, r.fullName]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(q))
      );
    }
    return list;
  }, [resumes, statusFilter, query]);

  const hasAny = Boolean(resumes && resumes.length > 0);

  return (
    <div className="mx-auto max-w-5xl py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl leading-tight tracking-tight text-foreground sm:text-4xl">
            My resumes
          </h2>
          <p className="mt-2 max-w-md text-base leading-relaxed text-muted-foreground">
            {hasAny
              ? "Label each version, track where you've applied, and pick up any of them where you left off."
              : "Every version you've saved, tailored to a different role."}
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
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </span>
          <p className="max-w-xs text-sm text-muted-foreground">
            Nothing saved yet — build a resume and choose to save it when you export.
          </p>
          <Button onClick={onNew} className="mt-2 gap-2">
            Build my first resume
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {hasAny && (
        <>
          {/* filter + search bar */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <FilterChip
                label="All"
                count={counts.all}
                active={statusFilter === "all"}
                tone="border-border text-muted-foreground"
                onClick={() => setStatusFilter("all")}
              />
              {APPLICATION_STATUS_OPTIONS.filter((o) => counts[o.value]).map((o) => (
                <FilterChip
                  key={o.value}
                  label={o.label}
                  count={counts[o.value]}
                  active={statusFilter === o.value}
                  tone={toneFor(o.value).chip}
                  onClick={() => setStatusFilter(statusFilter === o.value ? "all" : o.value)}
                />
              ))}
            </div>

            <div className="relative ml-auto min-w-[200px] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search label, role, company…"
                aria-label="Search resumes"
                className="w-full rounded-lg border border-border bg-card py-1.5 pl-8 pr-2.5 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/15"
              />
            </div>
          </div>

          {visible.length === 0 ? (
            <p className="mt-10 rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
              No resumes match that filter.
            </p>
          ) : (
            <ul className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {visible.map((r) => {
                const tone = toneFor(r.applicationStatus);
                return (
                  <li
                    key={r.resumeId}
                    className="group relative overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md"
                  >
                    {/* status accent stripe — scannable down the column */}
                    <span
                      aria-hidden
                      className={cn("absolute inset-y-0 left-0 w-1", tone.stripe)}
                    />

                    <div className="flex flex-col gap-3 py-4 pl-6 pr-4">
                      {/* row 1: persona label + template/public */}
                      <div className="flex items-start justify-between gap-2">
                        <PersonaLabel
                          value={r.personaLabel}
                          onSave={(v) => updatePersonaLabel(r.resumeId, v)}
                        />
                        <div className="flex shrink-0 items-center gap-1.5">
                          {r.isPublic && (
                            <span
                              title="Shared via link"
                              className="flex items-center gap-1 rounded-full bg-brand-muted/50 px-2 py-0.5 text-[10px] font-medium text-brand"
                            >
                              <Globe className="h-2.5 w-2.5" />
                              Shared
                            </span>
                          )}
                          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] capitalize text-muted-foreground">
                            {r.templateId}
                          </span>
                        </div>
                      </div>

                      {/* row 2: the actual identity of this resume */}
                      <button onClick={() => onOpen(r)} className="text-left">
                        <span className="block text-[15px] font-medium leading-snug text-foreground transition-colors group-hover:text-brand">
                          {r.targetRole || "Untitled role"}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {r.fullName} · updated {formatUpdated(r.updatedAt)}
                        </span>
                      </button>

                      {/* row 3: tracker */}
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={r.applicationStatus}
                          onChange={(e) =>
                            updateStatus(r.resumeId, e.target.value as ApplicationStatus)
                          }
                          aria-label="Application status"
                          className={cn(
                            "cursor-pointer rounded-full border-0 px-2.5 py-1 text-[11px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-brand/30",
                            tone.pill
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
                            if (e.target.value !== r.companyName)
                              updateCompany(r.resumeId, e.target.value);
                          }}
                          placeholder="Company…"
                          aria-label="Company applied to"
                          className="min-w-0 flex-1 rounded-md border border-transparent bg-muted/40 px-2 py-1 text-[11px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 hover:border-border focus-visible:border-brand focus-visible:bg-background"
                        />
                      </div>

                      {/* row 4: actions */}
                      <div className="flex items-center justify-between border-t border-border/70 pt-2.5">
                        <button
                          onClick={() => onOpen(r)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-brand transition-colors hover:gap-1.5"
                        >
                          Open
                          <ArrowRight className="h-3 w-3 transition-transform" />
                        </button>
                        {onRetailor && (
                          <button
                            onClick={() => onRetailor(r)}
                            className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <Repeat className="h-3 w-3" />
                            Tailor for another role
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  tone,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  tone: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all",
        tone,
        active ? "ring-2 ring-brand/30 ring-offset-1 ring-offset-background" : "opacity-70 hover:opacity-100"
      )}
    >
      {label}
      <span className="tabular-nums opacity-60">{count}</span>
    </button>
  );
}

// Reads as a label, edits as a field. The previous always-on input looked
// like a static heading — an empty one showed placeholder text where a
// title should be, so it wasn't obvious anything was editable.
function PersonaLabel({
  value,
  onSave,
}: {
  value: string;
  onSave: (next: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  function commit() {
    setEditing(false);
    const next = draft.trim();
    if (next !== value) onSave(next);
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        value={draft}
        maxLength={80}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        placeholder="e.g. IC track"
        aria-label="Version label"
        className="min-w-0 flex-1 rounded-md border border-brand bg-background px-2 py-0.5 text-[11px] font-medium text-foreground outline-none ring-4 ring-brand/15"
      />
    );
  }

  return value ? (
    <button
      onClick={() => setEditing(true)}
      title="Rename this version"
      className="inline-flex min-w-0 items-center gap-1 rounded-full bg-brand-muted/60 px-2.5 py-0.5 text-[11px] font-semibold text-brand transition-colors hover:bg-brand-muted"
    >
      <Tag className="h-2.5 w-2.5 shrink-0" />
      <span className="truncate">{value}</span>
    </button>
  ) : (
    <button
      onClick={() => setEditing(true)}
      className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand"
    >
      <Plus className="h-2.5 w-2.5" />
      Add label
    </button>
  );
}
