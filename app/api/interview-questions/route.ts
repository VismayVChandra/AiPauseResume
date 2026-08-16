import { NextRequest, NextResponse } from "next/server";
import { AIService } from "@/lib/ai-service";
import { TailoredResumeSchema } from "@/lib/schemas";

export const runtime = "nodejs";

// Takes the resume object directly from the client (same pattern as
// export-pdf/export-docx) rather than re-fetching by id, so questions are
// always generated from exactly what's on screen, edited or not.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = TailoredResumeSchema.safeParse(body.resume);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid resume data." }, { status: 400 });
    }

    const questions = await AIService.predictInterviewQuestions(parsed.data);
    return NextResponse.json({ questions });
  } catch (err) {
    console.error("interview-questions error:", err);
    const message = err instanceof Error ? err.message : "Failed to generate questions.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
