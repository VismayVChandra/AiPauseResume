"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Plus,
  FileText,
  Loader2,
  Repeat,
  Tag,
  Globe,
  Search,
  BellRing,
  MessageSquare,
  Scale,
  Clock,
  CheckSquare,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAccessToken } from "@/lib/supabase";
import { APPLICATION_STATUS_OPTIONS, ApplicationStatus } from "@/types/resume";
import { cn } from "@/lib/utils";
import { ResumeCompare, type CompareSpec } from "@/components/genforge/resume-compare";

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
  unresolvedCommentCount: number;
}

// A resume nudges "follow up" once it's sat in "applied" for a while with
// no movement — the one part of the actual job-search loop (not just the
// resume-building loop) the tracker didn't previously surface at all.
const FOLLOW_UP_AFTER_DAYS = 7;

function daysSince(iso: string): number | null {
  if (!iso) return null;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;
  return Math.floor((Date.now() - then.getTime()) / 86_400_000);
}

function needsFollowUp(r: Pick<SavedResumeSummary, "applicationStatus" | "appliedAt">): number | null {
  if (r.applicationStatus !== "applied") return null;
  const days = daysSince(r.appliedAt);
  if (days === null || days < FOLLOW_UP_AFTER_DAYS) return null;
  return days;
}

// A separate, quieter nudge for the opposite problem: a resume that was
// built and then never touched again. Only fires for "not_applied" —
// once something's actually in motion (applied/interviewing/etc.) its
// age isn't the interesting signal anymore, needsFollowUp covers that.
const STALE_AFTER_DAYS = 60;

function needsRefresh(r: Pick<SavedResumeSummary, "applicationStatus" | "updatedAt">): number | null {
  if (r.applicationStatus !== "not_applied") return null;
  const days = daysSince(r.updatedAt);
  if (days === null || days < STALE_AFTER_DAYS) return null;
  return days;
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
    pill: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    stripe: "bg-blue-400",
    chip: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/40 dark:bg-blue-950/40 dark:text-blue-300",
  },
  interviewing: {
    pill: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
    stripe: "bg-amber-400",
    chip: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-300",
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
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [comparing, setComparing] = useState<[CompareSpec, CompareSpec] | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  function toggleCompareMode() {
    setCompareMode((v) => !v);
    setSelectedForCompare([]);
    setSelectMode(false);
    setSelectedForDelete([]);
  }

  function toggleSelectMode() {
    setSelectMode((v) => !v);
    setSelectedForDelete([]);
    setCompareMode(false);
    setSelectedForCompare([]);
  }

  function toggleSelected(resumeId: string) {
    setSelectedForCompare((prev) => {
      if (prev.includes(resumeId)) return prev.filter((id) => id !== resumeId);
      if (prev.length >= 2) return [prev[1], resumeId];
      return [...prev, resumeId];
    });
  }

  function toggleSelectedForDelete(resumeId: string) {
    setSelectedForDelete((prev) =>
      prev.includes(resumeId) ? prev.filter((id) => id !== resumeId) : [...prev, resumeId]
    );
  }

  async function deleteSelected() {
    const ids = selectedForDelete;
    if (ids.length === 0) return;
    const label = ids.length === 1 ? "this resume" : `these ${ids.length} resumes`;
    if (!window.confirm(`Delete ${label}? This can't be undone.`)) return;

    setDeleting(true);
    try {
      const token = await getAccessToken();
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      await Promise.all(ids.map((id) => fetch(`/api/resumes/${id}`, { method: "DELETE", headers })));
      setResumes((prev) => (prev ? prev.filter((r) => !ids.includes(r.resumeId)) : prev));
      setSelectedForDelete([]);
      setSelectMode(false);
    } catch {
      setError("Couldn't delete one or more resumes — try again.");
    } finally {
      setDeleting(false);
    }
  }

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
    // First move into "applied" starts the follow-up clock automatically —
    // asking the user to separately pick a date they already just implied
    // by changing the status would be one more field nobody fills in.
    const current = resumes?.find((r) => r.resumeId === resumeId);
    const shouldStampAppliedAt = status === "applied" && current && !current.appliedAt;
    const appliedAt = shouldStampAppliedAt ? new Date().toISOString().slice(0, 10) : undefined;

    patchLocal(resumeId, { applicationStatus: status, ...(appliedAt ? { appliedAt } : {}) });
    patchTracker(resumeId, { status, ...(appliedAt ? { appliedAt } : {}) });
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
        <div className="flex items-center gap-2">
          {hasAny && (
            <Button
              variant={compareMode ? "default" : "outline"}
              size="lg"
              onClick={toggleCompareMode}
              className="gap-2"
            >
              <Scale className="h-4 w-4" />
              {compareMode ? "Cancel compare" : "Compare"}
            </Button>
          )}
          {hasAny && (
            <Button
              variant={selectMode ? "default" : "outline"}
              size="lg"
              onClick={toggleSelectMode}
              className="gap-2"
            >
              <CheckSquare className="h-4 w-4" />
              {selectMode ? "Cancel select" : "Select"}
            </Button>
          )}
          <Button size="lg" onClick={onNew} className="gap-2">
            <Plus className="h-4 w-4" />
            New resume
          </Button>
        </div>
      </div>

      {compareMode && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-brand/30 bg-brand-muted/30 px-3 py-2 text-xs text-brand">
          <Scale className="h-3.5 w-3.5 shrink-0" />
          {selectedForCompare.length < 2
            ? `Pick ${2 - selectedForCompare.length} more resume${selectedForCompare.length === 1 ? "" : "s"} to compare.`
            : "Two selected."}
          {selectedForCompare.length === 2 && (
            <button
              onClick={() =>
                setComparing([
                  { kind: "live", resumeId: selectedForCompare[0] },
                  { kind: "live", resumeId: selectedForCompare[1] },
                ])
              }
              className="ml-auto rounded-md bg-brand px-2.5 py-1 text-[11px] font-medium text-brand-foreground transition-colors hover:bg-brand/90"
            >
              Compare these two
            </button>
          )}
        </div>
      )}

      {selectMode && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <Trash2 className="h-3.5 w-3.5 shrink-0" />
          {selectedForDelete.length === 0
            ? "Tap resumes to select them for deletion."
            : `${selectedForDelete.length} selected.`}
          {selectedForDelete.length > 0 && (
            <button
              onClick={deleteSelected}
              disabled={deleting}
              className="ml-auto rounded-md bg-destructive px-2.5 py-1 text-[11px] font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : `Delete ${selectedForDelete.length}`}
            </button>
          )}
        </div>
      )}

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
                const followUpDays = needsFollowUp(r);
                const staleDays = needsRefresh(r);
                const selected = selectedForCompare.includes(r.resumeId);
                const selectedDelete = selectedForDelete.includes(r.resumeId);
                return (
                  <li
                    key={r.resumeId}
                    className={cn(
                      "group relative overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md",
                      selected && "border-brand ring-2 ring-brand/25",
                      selectedDelete && "border-destructive ring-2 ring-destructive/25"
                    )}
                  >
                    {/* status accent stripe — scannable down the column */}
                    <span
                      aria-hidden
                      className={cn("absolute inset-y-0 left-0 w-1", tone.stripe)}
                    />

                    <div className="flex flex-col gap-3 py-4 pl-6 pr-4">
                      {/* row 1: persona label + template/public/feedback */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          {compareMode && (
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleSelected(r.resumeId)}
                              aria-label="Select for comparison"
                              className="h-4 w-4 shrink-0 cursor-pointer accent-brand"
                            />
                          )}
                          {selectMode && (
                            <input
                              type="checkbox"
                              checked={selectedDelete}
                              onChange={() => toggleSelectedForDelete(r.resumeId)}
                              aria-label="Select for deletion"
                              className="h-4 w-4 shrink-0 cursor-pointer accent-destructive"
                            />
                          )}
                          <PersonaLabel
                            value={r.personaLabel}
                            onSave={(v) => updatePersonaLabel(r.resumeId, v)}
                          />
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {r.unresolvedCommentCount > 0 && (
                            <span
                              title={`${r.unresolvedCommentCount} unresolved comment${r.unresolvedCommentCount === 1 ? "" : "s"}`}
                              className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                            >
                              <MessageSquare className="h-2.5 w-2.5" />
                              {r.unresolvedCommentCount}
                            </span>
                          )}
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

                      {followUpDays !== null && (
                        <div className="flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                          <BellRing className="h-3 w-3 shrink-0" />
                          Applied {followUpDays} days ago — maybe follow up.
                        </div>
                      )}

                      {staleDays !== null && (
                        <div className="flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground">
                          <Clock className="h-3 w-3 shrink-0" />
                          Untouched for {staleDays} days — still worth applying?
                        </div>
                      )}

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

      {comparing && (
        <ResumeCompare
          sideA={comparing[0]}
          sideB={comparing[1]}
          onClose={() => {
            setComparing(null);
            setSelectedForCompare([]);
            setCompareMode(false);
          }}
        />
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
