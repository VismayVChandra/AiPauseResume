import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { CoverLetterPdfDocument } from "@/lib/cover-letter-pdf";
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

    // Same react-pdf typing quirk as export-pdf/route.ts — cast at the call site.
    const buffer = await renderToBuffer(
      React.createElement(CoverLetterPdfDocument, {
        resume: resumeParsed.data,
        coverLetter: letterParsed.data,
      }) as React.ReactElement<import("@react-pdf/renderer").DocumentProps>
    );

    const fileName = `${resumeParsed.data.fullName.replace(/\s+/g, "_") || "cover_letter"}_cover_letter.pdf`;
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    console.error("export-cover-letter-pdf error:", err);
    return NextResponse.json({ error: "Failed to generate cover letter PDF." }, { status: 500 });
  }
}
