import { NextRequest, NextResponse } from "next/server";
import { AIService } from "@/lib/ai-service";
import { TailoredResumeSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = TailoredResumeSchema.safeParse(body.resume);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid resume data." }, { status: 400 });
    }

    const condensed = await AIService.condenseResume(parsed.data);
    return NextResponse.json({ resume: condensed });
  } catch (err) {
    console.error("condense-resume error:", err);
    const message = err instanceof Error ? err.message : "Failed to condense resume.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
