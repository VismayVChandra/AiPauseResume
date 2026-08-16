import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { RawProfileSchema } from "@/lib/schemas";

export const runtime = "nodejs";

// "Manual entry as a last resort" — the user typed their own structured
// profile, so it's stored directly as career_profiles.profile_json with no
// AI extraction step in between.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = req.headers.get("x-session-id") || "anonymous";

    const parsed = RawProfileSchema.safeParse(body.profile);
    if (!parsed.success) {
      return NextResponse.json(
        { error: `Invalid profile data: ${parsed.error.message}` },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from("career_profiles")
      .insert({
        session_id: sessionId,
        source: "manual",
        raw_text: null,
        profile_json: parsed.data,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: "Failed to save profile." }, { status: 500 });
    }

    return NextResponse.json({ careerProfileId: data.id, profile: parsed.data });
  } catch (err) {
    console.error("manual-profile error:", err);
    return NextResponse.json({ error: "Failed to save profile." }, { status: 500 });
  }
}
