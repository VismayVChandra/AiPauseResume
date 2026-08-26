"use client";

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { ScoreHistoryEntry } from "@/types/resume";
import { getOrCreateSessionId, getAccessToken } from "@/lib/supabase";

// Self-contained, same pattern as the other export/score-screen panels —
// owns its own fetch. Renders a plain inline SVG polyline rather than
// pulling in a charting library for one small sparkline.
export function ScoreHistoryChart({
  resumeId,
  refreshKey,
}: {
  resumeId: string | null;
  refreshKey: number;
}) {
  const [entries, setEntries] = useState<ScoreHistoryEntry[] | null>(null);

  useEffect(() => {
    if (!resumeId) return;
    (async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch(`/api/resumes/${resumeId}/score-history`, {
          headers: {
            "x-session-id": getOrCreateSessionId(),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const json = await res.json();
        if (res.ok) setEntries(json.entries);
      } catch {
        // best-effort — history is a nice-to-have, not core to scoring
      }
    })();
    // refreshKey bumps after each new score run so this refetches
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeId, refreshKey]);

  if (!entries || entries.length < 2) return null;

  const width = 280;
  const height = 64;
  const padding = 6;
  const points = entries.map((e, i) => {
    const x = padding + (i / (entries.length - 1)) * (width - padding * 2);
    const y = height - padding - (e.overallScore / 100) * (height - padding * 2);
    return { x, y, score: e.overallScore };
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const first = entries[0].overallScore;
  const last = entries[entries.length - 1].overallScore;
  const delta = last - first;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          Score over time
        </span>
        {delta !== 0 && (
          <span className={delta > 0 ? "text-xs font-medium text-brand" : "text-xs font-medium text-destructive"}>
            {delta > 0 ? "+" : ""}
            {delta} since first score
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 w-full" preserveAspectRatio="none">
        <path d={path} fill="none" stroke="var(--brand)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="var(--brand)" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{entries[0].overallScore}</span>
        <span>{entries[entries.length - 1].overallScore}</span>
      </div>
    </div>
  );
}
