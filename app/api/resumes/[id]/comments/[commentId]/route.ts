import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { verifyResumeAccess } from "@/lib/resume-access";
import { z } from "zod";

export const runtime = "nodejs";

// Moderating a single comment — resolve/reopen or delete — is owner-only.
// A commenter can't do either to their own comment: with no login, a
// typed name is the only "identity" a comment has, and that isn't proof
// of anything, so there's no way to safely let "whoever claims to be the
// commenter" edit it later.

const BodySchema = z.object({ resolved: z.boolean() });

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    if (!(await verifyResumeAccess(req, params.id))) {
      return NextResponse.json({ error: "Resume not found." }, { status: 404 });
    }

    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const supabase = supabaseServer();
    const { error } = await supabase
      .from("resume_comments")
      .update({ resolved: parsed.data.resolved })
      .eq("id", params.commentId)
      .eq("resume_id", params.id);

    if (error) {
      console.error("resume-comment update error:", error);
      return NextResponse.json({ error: "Failed to update comment." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("resume-comment update error:", err);
    return NextResponse.json({ error: "Failed to update comment." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    if (!(await verifyResumeAccess(req, params.id))) {
      return NextResponse.json({ error: "Resume not found." }, { status: 404 });
    }

    const supabase = supabaseServer();
    const { error } = await supabase
      .from("resume_comments")
      .delete()
      .eq("id", params.commentId)
      .eq("resume_id", params.id);

    if (error) {
      console.error("resume-comment delete error:", error);
      return NextResponse.json({ error: "Failed to delete comment." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("resume-comment delete error:", err);
    return NextResponse.json({ error: "Failed to delete comment." }, { status: 500 });
  }
}
