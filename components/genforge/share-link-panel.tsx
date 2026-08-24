"use client";

import { useEffect, useState } from "react";
import { Link2, Check, Copy, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { getOrCreateSessionId, getAccessToken } from "@/lib/supabase";

async function resumeAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "x-session-id": getOrCreateSessionId() };
  const token = await getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

// Self-contained, same pattern as the Cover letter / Download panels on
// the export screen — owns its own is_public fetch/toggle. Off by default
// (see supabase/schema.sql); this panel is the only UI surface that turns
// it on, one resume at a time, and the user can turn it back off any time.
export function ShareLinkPanel({ resumeId }: { resumeId: string | null }) {
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!resumeId) return;
    resumeAuthHeaders()
      .then((headers) => fetch(`/api/resumes/${resumeId}`, { headers }))
      .then((r) => r.json())
      .then((json) => setIsPublic(Boolean(json.isPublic)))
      .catch(() => {});
  }, [resumeId]);

  const shareUrl =
    resumeId && typeof window !== "undefined" ? `${window.location.origin}/r/${resumeId}` : "";

  async function toggle(next: boolean) {
    if (!resumeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/resumes/${resumeId}/public`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(await resumeAuthHeaders()) },
        body: JSON.stringify({ isPublic: next }),
      });
      if (!res.ok) throw new Error("Couldn't update sharing.");
      setIsPublic(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update sharing.");
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!resumeId) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Link2 className="h-4 w-4 text-muted-foreground" />
        Share link
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        A read-only page anyone with the link can view — off by default, only this resume, only
        until you turn it back off.
      </p>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      {!isPublic ? (
        <button
          onClick={() => toggle(true)}
          disabled={loading}
          className="mt-3 w-full rounded-lg border border-brand/30 bg-brand-muted/30 px-3 py-2 text-xs font-medium text-brand transition-colors hover:bg-brand-muted/50 disabled:opacity-50"
        >
          {loading ? "Enabling…" : "Make shareable"}
        </button>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-2">
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
              {shareUrl}
            </span>
            <button
              onClick={copyLink}
              aria-label="Copy link"
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors",
                copied ? "text-brand" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <button
            onClick={() => toggle(false)}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <EyeOff className="h-3 w-3" />
            {loading ? "Turning off…" : "Stop sharing"}
          </button>
        </div>
      )}
    </div>
  );
}
