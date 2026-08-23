import { NextRequest, NextResponse } from "next/server";
import { buildCoverLetterDocx } from "@/lib/cover-letter-docx";
import { TailoredResumeSchema, CoverLetterSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const resumeParsed = TailoredResumeSchema.safeParse(body.resume);
    const letterParsed = CoverLetterSchema.safeParse(body.coverLetter);
    if (!resumeParsed.success || !letterParsed.success) {
      return NextResponse.json({ error: "Invalid cover letter data." }, { status: 400 });
    }

    const buffer = await buildCoverLetterDocx(resumeParsed.data, letterParsed.data);
    const fileName = `${resumeParsed.data.fullName.replace(/\s+/g, "_") || "cover_letter"}_cover_letter.docx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    console.error("export-cover-letter-docx error:", err);
    return NextResponse.json({ error: "Failed to generate cover letter DOCX." }, { status: 500 });
  }
}
