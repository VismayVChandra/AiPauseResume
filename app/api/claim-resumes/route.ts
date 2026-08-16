import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, getUserFromAuthHeader } from "@/lib/supabase";

export const runtime = "nodejs";

// Called once, right after a person signs in (from wherever they chose to
// — the export screen banner, or the "Sign in" link in the header). Not
// part of any required flow: guests never hit this route at all.
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromAuthHeader(req.headers.get("authorization"));
    if (!user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const { sessionId } = (await req.json()) as { sessionId?: string };
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
    }

    const supabase = supabaseServer();

    const { error: profilesError } = await supabase
      .from("career_profiles")
      .update({ user_id: user.id })
      .eq("session_id", sessionId)
      .is("user_id", null);

    const { error: resumesError } = await supabase
      .from("resumes")
      .update({ user_id: user.id })
      .eq("session_id", sessionId)
      .is("user_id", null);

    if (profilesError || resumesError) {
      console.error("claim-resumes error:", profilesError || resumesError);
      return NextResponse.json({ error: "Failed to save your resumes to your account." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("claim-resumes error:", err);
    return NextResponse.json({ error: "Failed to save your resumes to your account." }, { status: 500 });
  }
}
