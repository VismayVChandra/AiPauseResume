import { NextRequest, NextResponse } from "next/server";
import { buildResumeTxt } from "@/lib/txt-export";
import { TailoredResumeSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = TailoredResumeSchema.safeParse(body.resume);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid resume data." }, { status: 400 });
    }

    const text = buildResumeTxt(parsed.data);
    const fileName = `${parsed.data.fullName.replace(/\s+/g, "_") || "resume"}.txt`;

    return new NextResponse(text, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    console.error("export-txt error:", err);
    return NextResponse.json({ error: "Failed to generate text export." }, { status: 500 });
  }
}
