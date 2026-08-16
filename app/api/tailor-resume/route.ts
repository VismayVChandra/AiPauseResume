import { NextRequest, NextResponse } from "next/server";
import { AIService } from "@/lib/ai-service";
import { supabaseServer } from "@/lib/supabase";
import { RawProfile } from "@/types/resume";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { careerProfileId, targetRole, templateId, sessionId } = body as {
      careerProfileId: string;
      targetRole: string;
      templateId?: "classic" | "modern" | "minimal";
      sessionId: string;
    };

    if (!careerProfileId || !targetRole || !sessionId) {
      return NextResponse.json(
        { error: "careerProfileId, targetRole, and sessionId are required." },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();
    const { data: profileRow, error: fetchError } = await supabase
      .from("career_profiles")
      .select("id, profile_json")
      .eq("id", careerProfileId)
      .single();

    if (fetchError || !profileRow) {
      return NextResponse.json({ error: "Career profile not found." }, { status: 404 });
    }

    const profile = profileRow.profile_json as RawProfile;
    const tailored = await AIService.tailorResume(profile, targetRole, templateId || "classic");

    const { data: resumeRow, error: insertError } = await supabase
      .from("resumes")
      .insert({
        career_profile_id: careerProfileId,
        session_id: sessionId,
        target_role: targetRole,
        resume_json: tailored,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      return NextResponse.json({ error: "Failed to save tailored resume." }, { status: 500 });
    }

    return NextResponse.json({ resumeId: resumeRow.id, resume: tailored });
  } catch (err) {
    console.error("tailor-resume error:", err);
    const message = err instanceof Error ? err.message : "Tailoring failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
