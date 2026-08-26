import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { verifyResumeAccess } from "@/lib/resume-access";
import { z } from "zod";

export const runtime = "nodejs";

// One row per successful score-resume run — lets the score screen chart
// whether edits are actually moving the number over a series of runs.

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await verifyResumeAccess(req, params.id))) {
    return NextResponse.json({ error: "Resume not found." }, { status: 404 });
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("score_history")
    .select("id, overall_score, ats_score, role_match_score, skills_match_score, created_at")
    .eq("resume_id", params.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("score-history list error:", error);
    return NextResponse.json({ error: "Failed to load score history." }, { status: 500 });
  }

  const entries = (data || []).map((row) => ({
    id: row.id as string,
    overallScore: row.overall_score as number,
    atsScore: row.ats_score as number,
    roleMatchScore: row.role_match_score as number,
    skillsMatchScore: row.skills_match_score as number,
    createdAt: row.created_at as string,
  }));

  return NextResponse.json({ entries });
}

const BodySchema = z.object({
  overallScore: z.number().min(0).max(100),
  atsScore: z.number().min(0).max(100),
  roleMatchScore: z.number().min(0).max(100),
  skillsMatchScore: z.number().min(0).max(100),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!(await verifyResumeAccess(req, params.id))) {
      return NextResponse.json({ error: "Resume not found." }, { status: 404 });
    }

    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: `Invalid score-history payload: ${parsed.error.message}` },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();
    const { error } = await supabase.from("score_history").insert({
      resume_id: params.id,
      overall_score: parsed.data.overallScore,
      ats_score: parsed.data.atsScore,
      role_match_score: parsed.data.roleMatchScore,
      skills_match_score: parsed.data.skillsMatchScore,
    });

    if (error) {
      console.error("score-history insert error:", error);
      return NextResponse.json({ error: "Failed to save score snapshot." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("score-history insert error:", err);
    return NextResponse.json({ error: "Failed to save score snapshot." }, { status: 500 });
  }
}
