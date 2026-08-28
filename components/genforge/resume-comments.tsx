"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Send, Trash2, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getOrCreateSessionId, getAccessToken } from "@/lib/supabase";
import { COMMENT_SECTIONS, COMMENT_SECTION_LABELS, type CommentSection } from "@/lib/schemas";

const NAME_STORAGE_KEY = "pauseresume_commenter_name";

interface Comment {
  id: string;
  section: string;
  commenterName: string;
  body: string;
  resolved: boolean;
  createdAt: string;
}

async function resumeAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "x-session-id": getOrCreateSessionId() };
  const token = await getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

function sectionLabel(section: string): string {
  return COMMENT_SECTION_LABELS[section as CommentSection] || section;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

// Shown two places: read-only-plus-posting on the public /r/[id] share
// page (mode="public"), and read-only-plus-moderation on the owner's
// export screen (mode="owner", next to the share-link toggle that's the
// only way this ever gets any comments in the first place).
export function ResumeComments({
  resumeId,
  mode,
  availableSections,
}: {
  resumeId: string | null;
  mode: "owner" | "public";
  availableSections?: CommentSection[];
}) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [section, setSection] = useState<CommentSection>("general");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const sections = availableSections && availableSections.length > 0 ? availableSections : COMMENT_SECTIONS;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(NAME_STORAGE_KEY);
      if (stored) setName(stored);
    } catch {
      // storage blocked — no prefill, not fatal
    }
  }, []);

  useEffect(() => {
    if (!resumeId) return;
    let cancelled = false;
    async function load() {
      try {
        const headers = mode === "owner" ? await resumeAuthHeaders() : undefined;
        const res = await fetch(`/api/resumes/${resumeId}/comments`, { headers });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error || "Couldn't load comments.");
          return;
        }
        setComments(json.comments || []);
      } catch {
        if (!cancelled) setError("Couldn't load comments.");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [resumeId, mode]);

  async function submitComment() {
    const trimmedName = name.trim();
    const trimmedBody = body.trim();
    if (!trimmedName || !trimmedBody) return;
    setPosting(true);
    setError(null);
    try {
      const res = await fetch(`/api/resumes/${resumeId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, commenterName: trimmedName, body: trimmedBody }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to post comment.");
      setComments((prev) => [...(prev || []), json.comment]);
      setBody("");
      try {
        localStorage.setItem(NAME_STORAGE_KEY, trimmedName);
      } catch {
        // non-fatal
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to post comment.");
    } finally {
      setPosting(false);
    }
  }

  async function toggleResolved(comment: Comment) {
    setBusyId(comment.id);
    try {
      const res = await fetch(`/api/resumes/${resumeId}/comments/${comment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(await resumeAuthHeaders()) },
        body: JSON.stringify({ resolved: !comment.resolved }),
      });
      if (!res.ok) throw new Error();
      setComments(
        (prev) => prev && prev.map((c) => (c.id === comment.id ? { ...c, resolved: !c.resolved } : c))
      );
    } catch {
      setError("Couldn't update that comment.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteComment(comment: Comment) {
    if (!window.confirm("Delete this comment? This can't be undone.")) return;
    setBusyId(comment.id);
    try {
      const res = await fetch(`/api/resumes/${resumeId}/comments/${comment.id}`, {
        method: "DELETE",
        headers: await resumeAuthHeaders(),
      });
      if (!res.ok) throw new Error();
      setComments((prev) => prev && prev.filter((c) => c.id !== comment.id));
    } catch {
      setError("Couldn't delete that comment.");
    } finally {
      setBusyId(null);
    }
  }

  if (!resumeId) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        Reviewer feedback
        {comments && comments.length > 0 && (
          <span className="text-xs font-normal text-muted-foreground">({comments.length})</span>
        )}
      </h3>
      {mode === "public" && (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Leave feedback for whoever shared this — no account needed.
        </p>
      )}

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      <div className="mt-3 flex flex-col gap-2.5">
        {comments === null && <p className="text-xs text-muted-foreground">Loading…</p>}
        {comments && comments.length === 0 && (
          <p className="text-xs text-muted-foreground">
            {mode === "owner" ? "No feedback yet." : "No feedback yet — be the first."}
          </p>
        )}
        {comments &&
          comments.map((c) => (
            <div
              key={c.id}
              className={cn(
                "rounded-lg border border-border bg-background p-3",
                c.resolved && "opacity-60"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-xs font-medium text-foreground">{c.commenterName}</span>
                  <span className="shrink-0 rounded-full bg-brand-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-brand">
                    {sectionLabel(c.section)}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{formatDate(c.createdAt)}</span>
                </div>
                {mode === "owner" && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => toggleResolved(c)}
                      disabled={busyId === c.id}
                      aria-label={c.resolved ? "Reopen" : "Mark resolved"}
                      className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-brand disabled:opacity-50"
                    >
                      {c.resolved ? <CheckCircle2 className="h-3.5 w-3.5 text-brand" /> : <Circle className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => deleteComment(c)}
                      disabled={busyId === c.id}
                      aria-label="Delete comment"
                      className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <p className={cn("mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-foreground", c.resolved && "line-through")}>
                {c.body}
              </p>
            </div>
          ))}
      </div>

      {mode === "public" && (
        <div className="mt-4 flex flex-col gap-2 border-t border-border/70 pt-4">
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={60}
              className="w-28 shrink-0 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-brand/50"
            />
            <select
              value={section}
              onChange={(e) => setSection(e.target.value as CommentSection)}
              className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-brand/50"
            >
              {sections.map((s) => (
                <option key={s} value={s}>
                  {sectionLabel(s)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What would you tell them?"
              maxLength={2000}
              rows={2}
              className="flex-1 resize-none rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-brand/50"
            />
            <button
              onClick={submitComment}
              disabled={posting || !name.trim() || !body.trim()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand text-brand-foreground transition-colors hover:bg-brand/90 disabled:opacity-40"
              aria-label="Post comment"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
