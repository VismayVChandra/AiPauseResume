import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase";

// Every AI-calling route is a paid Gemini call sitting behind a public
// URL — this is the only thing standing between that and someone hammering
// it in a loop. Keyed by caller IP (the standard choice for abuse
// protection, and the one identifier every request actually has,
// regardless of which routes happen to also carry a session id).
const DEFAULT_WINDOW_SECONDS = 3600;
const DEFAULT_LIMIT = 30;

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/**
 * Returns true if the caller is still under the limit for this route
 * (and atomically counts this call toward it). Fails OPEN on an
 * infrastructure hiccup (e.g. the increment_rate_limit function/table
 * doesn't exist yet, pre-migration) — a rate limiter that's down
 * shouldn't take real users down with it.
 */
export async function checkRateLimit(
  req: NextRequest,
  routeName: string,
  opts?: { windowSeconds?: number; limit?: number }
): Promise<boolean> {
  const windowSeconds = opts?.windowSeconds ?? DEFAULT_WINDOW_SECONDS;
  const limit = opts?.limit ?? DEFAULT_LIMIT;
  const key = `${routeName}:${getClientIp(req)}`;

  const supabase = supabaseServer();
  const { data, error } = await supabase.rpc("increment_rate_limit", {
    p_key: key,
    p_window_seconds: windowSeconds,
    p_limit: limit,
  });

  if (error) {
    console.error("rate-limit check error:", error);
    return true;
  }
  return Boolean(data);
}

export function rateLimitResponse() {
  return { error: "Too many requests — please slow down and try again in a bit." };
}
