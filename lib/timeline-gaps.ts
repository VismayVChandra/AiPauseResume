import { Experience, TimelineGap } from "@/types/resume";

// Deterministic (non-AI) gap detection between consecutive roles — pure
// date math on the same startDate/endDate strings already on the resume,
// not a model's judgment call. Dates on resumes are free text ("March
// 2020", "09/2020", "2020", "Present"), so parsing is deliberately lenient
// — a date this function can't parse is just skipped rather than guessed at.

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9,
  sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11,
  dec: 12, december: 12,
};

type ApproxDate = { year: number; month: number };

function parseApproxDate(raw?: string): ApproxDate | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (!s) return null;

  if (/present|current|now|ongoing/.test(s)) {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }

  let m = s.match(/^([a-z]+)\.?\s+(\d{4})$/); // "March 2020" / "Mar. 2020"
  if (m && MONTHS[m[1]]) return { year: Number(m[2]), month: MONTHS[m[1]] };

  m = s.match(/^(\d{4})-(\d{1,2})$/); // "2020-09"
  if (m) return { year: Number(m[1]), month: Number(m[2]) };

  m = s.match(/^(\d{1,2})\/(\d{4})$/); // "09/2020"
  if (m) return { year: Number(m[2]), month: Number(m[1]) };

  m = s.match(/^(\d{4})$/); // bare year — assume mid-year to avoid systematic bias
  if (m) return { year: Number(m[1]), month: 6 };

  return null;
}

function monthsBetween(a: ApproxDate, b: ApproxDate): number {
  return (b.year - a.year) * 12 + (b.month - a.month);
}

function toAbsoluteMonths(d: ApproxDate): number {
  return d.year * 12 + d.month;
}

/**
 * Finds gaps of at least `minGapMonths` between the end of one role and the
 * start of the next, once experience entries are sorted chronologically by
 * start date. Entries with an unparseable start date are excluded rather
 * than mis-sorted; a gap is only reported when both surrounding dates
 * parsed successfully.
 */
export function detectTimelineGaps(
  experience: Experience[],
  minGapMonths = 3
): TimelineGap[] {
  const entries = experience
    .map((e) => ({
      label: `${e.title || "Role"}${e.company ? " @ " + e.company : ""}`,
      start: parseApproxDate(e.startDate),
      end: parseApproxDate(e.endDate),
    }))
    .filter((e): e is { label: string; start: ApproxDate; end: ApproxDate | null } => e.start !== null);

  entries.sort((a, b) => toAbsoluteMonths(a.start) - toAbsoluteMonths(b.start));

  const gaps: TimelineGap[] = [];
  for (let i = 0; i < entries.length - 1; i++) {
    const current = entries[i];
    const next = entries[i + 1];
    if (!current.end) continue;
    const gapMonths = monthsBetween(current.end, next.start);
    if (gapMonths >= minGapMonths) {
      gaps.push({ beforeLabel: current.label, afterLabel: next.label, months: gapMonths });
    }
  }
  return gaps;
}
