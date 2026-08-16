import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, getUserFromAuthHeader } from "@/lib/supabase";
import { TailoredResume } from "@/types/resume";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromAuthHeader(req.headers.get("authorization"));
    if (!user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from("resumes")
      .select("id, target_role, resume_json, updated_at, career_profile_id")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("my-resumes error:", error);
      return NextResponse.json({ error: "Failed to load your resumes." }, { status: 500 });
    }

    const resumes = (data || []).map((row) => {
      const resume = row.resume_json as TailoredResume;
      return {
        resumeId: row.id as string,
        careerProfileId: row.career_profile_id as string,
        targetRole: (row.target_role as string) || resume.targetRole,
        fullName: resume.fullName,
        templateId: resume.templateId,
        updatedAt: row.updated_at as string,
      };
    });

    return NextResponse.json({ resumes });
  } catch (err) {
    console.error("my-resumes error:", err);
    return NextResponse.json({ error: "Failed to load your resumes." }, { status: 500 });
  }
}
