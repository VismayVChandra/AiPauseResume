import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { verifyResumeAccess } from "@/lib/resume-access";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { ResumeCommentBodySchema } from "@/lib/schemas";

export const runtime = "nodejs";

// Reviewer/mentor comments left from the read-only /r/[id] share page.
// GET is readable by the resume's owner (any time) or by anyone else only
// once the resume is public — same visibility rule as the share page
// itself. POST (leaving a comment) requires the resume to actually be
// public: the link is the only distribution channel, so if it isn't
// shared there's no legitimate way to have gotten here to comment. No
// login is required to comment — a typed display name is the only
// identity, per the app's "anyone with the link" sharing model.

function toClient(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    section: row.section as string,
    commenterName: row.commenter_name as string,
    body: row.body as string,
    resolved: row.resolved as boolean,
    createdAt: row.created_at as string,
  };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const { data: resume, error: resumeError } = await supabase
    .from("resumes")
    .select("is_public")
    .eq("id", params.id)
    .single();

  if (resumeError || !resume) {
    return NextResponse.json({ error: "Resume not found." }, { status: 404 });
  }

  const isOwner = await verifyResumeAccess(req, params.id);
  if (!resume.is_public && !isOwner) {
    return NextResponse.json({ error: "Resume not found." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("resume_comments")
    .select("id, section, commenter_name, body, resolved, created_at")
    .eq("resume_id", params.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("resume-comments list error:", error);
    return NextResponse.json({ error: "Failed to load comments." }, { status: 500 });
  }

  return NextResponse.json({ comments: (data || []).map(toClient) });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const okRate = await checkRateLimit(req, "resume-comments", { windowSeconds: 3600, limit: 20 });
    if (!okRate) {
      return NextResponse.json(rateLimitResponse(), { status: 429 });
    }

    const supabase = supabaseServer();
    const { data: resume, error: resumeError } = await supabase
      .from("resumes")
      .select("is_public")
      .eq("id", params.id)
      .single();

    if (resumeError || !resume || !resume.is_public) {
      return NextResponse.json({ error: "This resume isn't shared." }, { status: 404 });
    }

    const body = await req.json();
    const parsed = ResumeCommentBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid comment." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("resume_comments")
      .insert({
        resume_id: params.id,
        section: parsed.data.section,
        commenter_name: parsed.data.commenterName,
        body: parsed.data.body,
      })
      .select("id, section, commenter_name, body, resolved, created_at")
      .single();

    if (error) {
      console.error("resume-comments insert error:", error);
      return NextResponse.json({ error: "Failed to post comment." }, { status: 500 });
    }

    return NextResponse.json({ comment: toClient(data) });
  } catch (err) {
    console.error("resume-comments insert error:", err);
    return NextResponse.json({ error: "Failed to post comment." }, { status: 500 });
  }
}
