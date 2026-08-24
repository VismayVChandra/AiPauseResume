import { NextRequest, NextResponse } from "next/server";
import { AIService } from "@/lib/ai-service";
import { TailoredResumeSchema } from "@/lib/schemas";
import { z } from "zod";

export const runtime = "nodejs";

const BodySchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  resume: TailoredResumeSchema,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: `Invalid request: ${parsed.error.message}` },
        { status: 400 }
      );
    }

    const feedback = await AIService.evaluateInterviewAnswer(parsed.data);
    return NextResponse.json({ feedback });
  } catch (err) {
    console.error("interview-feedback error:", err);
    const message = err instanceof Error ? err.message : "Failed to get feedback.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
