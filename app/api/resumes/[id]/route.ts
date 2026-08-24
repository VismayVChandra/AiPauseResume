import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { TailoredResumeSchema, CoverLetterSchema } from "@/lib/schemas";

export const runtime = "nodejs";

// Called whenever the user edits a field on the review screen (step 5), or
// saves a generated/edited cover letter on the export screen. The whole
// edited resume object is re-validated — same schema as the AI output,
// since the review form treats AI-filled and user-added fields identically.
// coverLetter is optional: omit it to leave whatever's already saved alone.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const parsed = TailoredResumeSchema.safeParse(body.resume);
    if (!parsed.success) {
      return NextResponse.json(
        { error: `Invalid resume payload: ${parsed.error.message}` },
        { status: 400 }
      );
    }

    const update: Record<string, unknown> = {
      resume_json: parsed.data,
      updated_at: new Date().toISOString(),
    };

    if (body.coverLetter !== undefined) {
      if (body.coverLetter === null) {
        update.cover_letter_json = null;
      } else {
        const clParsed = CoverLetterSchema.safeParse(body.coverLetter);
        if (!clParsed.success) {
          return NextResponse.json(
            { error: `Invalid cover letter payload: ${clParsed.error.message}` },
            { status: 400 }
          );
        }
        update.cover_letter_json = clParsed.data;
      }
    }

    const supabase = supabaseServer();
    const { error } = await supabase.from("resumes").update(update).eq("id", params.id);

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json({ error: "Failed to save edits." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("resume update error:", err);
    return NextResponse.json({ error: "Failed to save edits." }, { status: 500 });
  }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("resumes")
    .select("id, career_profile_id, resume_json, cover_letter_json, is_public")
    .eq("id", params.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Resume not found." }, { status: 404 });
  }
  return NextResponse.json({
    resumeId: data.id,
    careerProfileId: data.career_profile_id,
    resume: data.resume_json,
    coverLetter: data.cover_letter_json,
    isPublic: Boolean(data.is_public),
  });
}
