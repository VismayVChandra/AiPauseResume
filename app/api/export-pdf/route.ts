import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { ResumePdfDocument } from "@/lib/pdf-template";
import { TailoredResumeSchema } from "@/lib/schemas";

export const runtime = "nodejs";

// Takes the resume object directly (the client already has it, edited or
// not) rather than re-fetching, so exports always reflect exactly what's on
// screen — including unsaved edits.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = TailoredResumeSchema.safeParse(body.resume);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid resume data." }, { status: 400 });
    }

    // react-pdf's renderToBuffer types itself as accepting a
    // ReactElement<DocumentProps> straight off <Document>, but we're
    // passing our own wrapper component (which renders a <Document>
    // internally) — the props shapes don't line up even though this is
    // exactly react-pdf's documented pattern. Cast at the call site.
    const buffer = await renderToBuffer(
      React.createElement(ResumePdfDocument, { resume: parsed.data }) as React.ReactElement<
        import("@react-pdf/renderer").DocumentProps
      >
    );

    // Real page count, not a heuristic — parse the PDF we just rendered so
    // the export screen can show "2 pages" and offer to condense to one.
    // Deliberately not the upload step's pdf-parse here: its bundled pdf.js
    // is a 2017 build that throws "bad XRef entry" on the cross-reference
    // streams @react-pdf/renderer emits once a photo <Image> is embedded —
    // pdf-lib is a maintained, general-purpose PDF library and doesn't
    // choke on that. Best-effort either way: a parse failure shouldn't
    // block the actual download.
    let pageCount: number | null = null;
    try {
      const { PDFDocument } = await import("pdf-lib");
      const doc = await PDFDocument.load(buffer);
      pageCount = doc.getPageCount();
    } catch (err) {
      console.error("export-pdf page-count error:", err);
    }

    const fileName = `${parsed.data.fullName.replace(/\s+/g, "_") || "resume"}.pdf`;
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        ...(pageCount !== null ? { "X-Resume-Pages": String(pageCount) } : {}),
      },
    });
  } catch (err) {
    console.error("export-pdf error:", err);
    return NextResponse.json({ error: "Failed to generate PDF." }, { status: 500 });
  }
}
