import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { TailoredResumeSchema } from "@/lib/schemas";
import { z } from "zod";

export const runtime = "nodejs";

// Version history for a resume — snapshots taken at meaningful checkpoints
// (initial tailor, right before an AI improvement is applied), not on
// every autosave edit. Lets a user see what changed and revert.

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("resume_versions")
    .select("id, label, resume_json, created_at")
    .eq("resume_id", params.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("versions list error:", error);
    return NextResponse.json({ error: "Failed to load version history." }, { status: 500 });
  }

  const versions = (data || []).map((row) => ({
    id: row.id as string,
    label: row.label as string,
    resume: row.resume_json,
    createdAt: row.created_at as string,
  }));

  return NextResponse.json({ versions });
}

const BodySchema = z.object({
  resume: TailoredResumeSchema,
  label: z.string().min(1).max(80),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: `Invalid version payload: ${parsed.error.message}` },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from("resume_versions")
      .insert({
        resume_id: params.id,
        label: parsed.data.label,
        resume_json: parsed.data.resume,
      })
      .select("id, created_at")
      .single();

    if (error) {
      console.error("version create error:", error);
      return NextResponse.json({ error: "Failed to save version." }, { status: 500 });
    }

    return NextResponse.json({ versionId: data.id, createdAt: data.created_at });
  } catch (err) {
    console.error("version create error:", err);
    return NextResponse.json({ error: "Failed to save version." }, { status: 500 });
  }
}
