import { NextRequest, NextResponse } from "next/server";
import { AIService } from "@/lib/ai-service";
import { TailoredResumeSchema } from "@/lib/schemas";

export const runtime = "nodejs";

// Takes the resume object directly from the client (same pattern as
// export-pdf/export-docx/interview-questions) so the letter is always
// grounded in exactly what's on screen, edited or not. Stateless — the
// export step persists the result itself via PATCH /api/resumes/[id] if
// the resume has been saved.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = TailoredResumeSchema.safeParse(body.resume);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid resume data." }, { status: 400 });
    }

    const coverLetter = await AIService.generateCoverLetter(parsed.data);
    return NextResponse.json({ coverLetter });
  } catch (err) {
    console.error("generate-cover-letter error:", err);
    const message = err instanceof Error ? err.message : "Failed to generate cover letter.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
