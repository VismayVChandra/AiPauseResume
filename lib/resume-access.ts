import { NextRequest } from "next/server";
import { supabaseServer, getUserFromAuthHeader } from "@/lib/supabase";

// Every resume-scoped route (the resume itself, its versions, the public
// share toggle, the application tracker) needs the same answer to "is this
// caller actually allowed to touch this resume?" — this is that check,
// shared so the answer stays consistent across all of them.
//
// Two ways in, matching how the rest of the app identifies a caller:
// - x-session-id header matches the anonymous session_id the resume was
//   created under (guest access, same browser).
// - A valid bearer token whose user matches the resume's user_id (signed
//   in, works across devices once claimed).
// Neither present/matching -> access denied. Callers should return 404
// (not 403) so a wrong guess doesn't confirm the resume exists.
export async function verifyResumeAccess(
  req: NextRequest,
  resumeId: string
): Promise<boolean> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("resumes")
    .select("session_id, user_id")
    .eq("id", resumeId)
    .single();

  if (error || !data) return false;

  const sessionId = req.headers.get("x-session-id");
  if (sessionId && data.session_id === sessionId) return true;

  const user = await getUserFromAuthHeader(req.headers.get("authorization"));
  if (user && data.user_id === user.id) return true;

  return false;
}
