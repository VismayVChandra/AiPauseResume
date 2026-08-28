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

    // Best-effort: how many open (unresolved) reviewer comments each resume
    // has, so My Resumes can badge "there's feedback waiting on this one."
    // resume_comments is a newer table some deployments haven't migrated
    // yet — a failure here shouldn't take down the whole list, it just
    // means every count comes back 0.
    const resumeIds = (data || []).map((row) => row.id as string);
    const unresolvedCounts: Record<string, number> = {};
    if (resumeIds.length > 0) {
      const { data: openComments, error: commentsError } = await supabase
        .from("resume_comments")
        .select("resume_id")
        .in("resume_id", resumeIds)
        .eq("resolved", false);
      if (!commentsError) {
        for (const row of openComments || []) {
          const id = row.resume_id as string;
          unresolvedCounts[id] = (unresolvedCounts[id] || 0) + 1;
        }
      }
    }

    const resumes = (data || []).map((row) => {
      const resume = row.resume_json as TailoredResume;
      const id = row.id as string;
      return {
        resumeId: id,
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
        unresolvedCommentCount: unresolvedCounts[id] || 0,
      };
    });

    return NextResponse.json({ resumes });
  } catch (err) {
    console.error("my-resumes error:", err);
    return NextResponse.json({ error: "Failed to load your resumes." }, { status: 500 });
  }
}
