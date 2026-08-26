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
    const baseColumns =
      "id, target_role, resume_json, updated_at, career_profile_id, is_public, application_status, company_name, applied_at";

    // persona_label is a newer column — select it separately from the
    // columns every deployment already has, so a project that hasn't run
    // that one migration yet still gets a working My Resumes list instead
    // of the whole query failing on one missing column (unlike a single
    // PATCH field, a SELECT can't partially succeed).
    let data: Record<string, unknown>[] | null = null;
    {
      const { data: withLabel, error } = await supabase
        .from("resumes")
        .select(`${baseColumns}, persona_label`)
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) {
        const { data: withoutLabel, error: fallbackError } = await supabase
          .from("resumes")
          .select(baseColumns)
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false });

        if (fallbackError) {
          console.error("my-resumes error:", fallbackError);
          return NextResponse.json({ error: "Failed to load your resumes." }, { status: 500 });
        }
        data = withoutLabel;
      } else {
        data = withLabel;
      }
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
        isPublic: Boolean(row.is_public),
        applicationStatus: (row.application_status as string) || "not_applied",
        companyName: (row.company_name as string) || "",
        appliedAt: (row.applied_at as string) || "",
        personaLabel: (row.persona_label as string) || "",
      };
    });

    return NextResponse.json({ resumes });
  } catch (err) {
    console.error("my-resumes error:", err);
    return NextResponse.json({ error: "Failed to load your resumes." }, { status: 500 });
  }
}
