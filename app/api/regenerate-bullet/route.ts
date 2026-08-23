import { NextRequest, NextResponse } from "next/server";
import { AIService } from "@/lib/ai-service";
import { z } from "zod";

export const runtime = "nodejs";

const BodySchema = z.object({
  bullet: z.string().min(1),
  targetRole: z.string().default(""),
  company: z.string().optional(),
  title: z.string().optional(),
  otherBullets: z.array(z.string()).default([]),
});

// Lighter-touch alternative to "Improve My Score" — rewrites one bullet at
// a time instead of the whole resume, so a single strong line doesn't get
// touched just because a whole-resume pass was triggered.
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

    const variants = await AIService.regenerateBullet(parsed.data);
    return NextResponse.json({ variants });
  } catch (err) {
    console.error("regenerate-bullet error:", err);
    const message = err instanceof Error ? err.message : "Failed to regenerate bullet.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
