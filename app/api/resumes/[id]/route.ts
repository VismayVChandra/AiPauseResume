import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { TailoredResumeSchema } from "@/lib/schemas";

export const runtime = "nodejs";

// Called whenever the user edits a field on the review screen (step 5).
// The whole edited resume object is re-validated — same schema as the AI
// output, since the review form treats AI-filled and user-added fields
// identically.
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

    const supabase = supabaseServer();
    const { error } = await supabase
      .from("resumes")
      .update({ resume_json: parsed.data, updated_at: new Date().toISOString() })
      .eq("id", params.id);

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
    .select("id, resume_json")
    .eq("id", params.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Resume not found." }, { status: 404 });
  }
  return NextResponse.json({ resumeId: data.id, resume: data.resume_json });
}
