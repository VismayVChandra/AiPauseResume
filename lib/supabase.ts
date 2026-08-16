import { createClient, SupabaseClient, User } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Singleton on the client so auth state (and the onAuthStateChange
// listener) stays consistent across the app instead of each call creating
// its own disconnected GoTrue instance.
let browserClient: SupabaseClient | null = null;
export function supabaseBrowser(): SupabaseClient {
  if (typeof window === "undefined") {
    // Server-side render pass — a throwaway client is fine, nothing here
    // touches auth state during SSR.
    return createClient(url, anonKey);
  }
  if (!browserClient) {
    browserClient = createClient(url, anonKey);
  }
  return browserClient;
}

// Used from API routes / server components — service role bypasses RLS,
// which is fine here since the API routes themselves are the real
// enforcement boundary (see supabase/schema.sql for details).
export const supabaseServer = () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return createClient(url, serviceKey || anonKey);
};

// Anonymous per-browser identifier. Always set, whether or not the person
// ever signs in — it's what guest work is keyed on, and what gets "claimed"
// onto their account if/when they choose to sign in.
export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "server";
  const key = "pauseresume_session_id";
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(key, id);
  }
  return id;
}

/* ------------------------------------------------------------------ */
/* Optional auth — email magic link. Never required to use the app;   */
/* only invoked when the person explicitly chooses to sign in to save */
/* resumes across sessions/devices.                                   */
/* ------------------------------------------------------------------ */

export async function sendMagicLink(email: string): Promise<{ error: string | null }> {
  const { error } = await supabaseBrowser().auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
    },
  });
  return { error: error?.message ?? null };
}

export async function signOut(): Promise<void> {
  await supabaseBrowser().auth.signOut();
}

export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabaseBrowser().auth.getUser();
  return data.user ?? null;
}

// Bearer token for authenticated API calls (e.g. /api/claim-resumes,
// /api/my-resumes) — null when signed out, since those calls are only
// ever made after the person has chosen to sign in.
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabaseBrowser().auth.getSession();
  return data.session?.access_token ?? null;
}

// Server-side: validate a bearer token from the Authorization header and
// return the user it belongs to, or null. Used by any API route that needs
// to know who's asking (claim-resumes, my-resumes) — those routes are the
// actual security boundary, not RLS (see supabase/schema.sql).
export async function getUserFromAuthHeader(
  authHeader: string | null
): Promise<User | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length);
  const { data, error } = await supabaseServer().auth.getUser(token);
  if (error) return null;
  return data.user ?? null;
}
