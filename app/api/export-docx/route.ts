import { NextRequest, NextResponse } from "next/server";
import { buildResumeDocx } from "@/lib/docx-export";
import { TailoredResumeSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = TailoredResumeSchema.safeParse(body.resume);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid resume data." }, { status: 400 });
    }

    const buffer = await buildResumeDocx(parsed.data);
    const fileName = `${parsed.data.fullName.replace(/\s+/g, "_") || "resume"}.docx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    console.error("export-docx error:", err);
    return NextResponse.json({ error: "Failed to generate DOCX." }, { status: 500 });
  }
}
