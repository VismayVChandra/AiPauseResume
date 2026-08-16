import { NextRequest, NextResponse } from "next/server";
import { AIService } from "@/lib/ai-service";
import { TailoredResumeSchema, ResumeScoreSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const resumeParsed = TailoredResumeSchema.safeParse(body.resume);
    const scoreParsed = ResumeScoreSchema.safeParse(body.score);
    if (!resumeParsed.success || !scoreParsed.success) {
      return NextResponse.json({ error: "Invalid resume or score data." }, { status: 400 });
    }

    const improved = await AIService.improveResume(resumeParsed.data, scoreParsed.data);
    return NextResponse.json({ resume: improved });
  } catch (err) {
    console.error("improve-resume error:", err);
    const message = err instanceof Error ? err.message : "Failed to improve resume.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
