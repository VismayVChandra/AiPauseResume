import { NextRequest, NextResponse } from "next/server";
import { AIService } from "@/lib/ai-service";
import { TailoredResumeSchema } from "@/lib/schemas";
import { z } from "zod";

export const runtime = "nodejs";

const BodySchema = z.object({
  resume: TailoredResumeSchema,
  suggestion: z.string().min(1),
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

    const updated = await AIService.applySuggestion(parsed.data.resume, parsed.data.suggestion);
    return NextResponse.json({ resume: updated });
  } catch (err) {
    console.error("apply-suggestion error:", err);
    const message = err instanceof Error ? err.message : "Failed to apply suggestion.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
