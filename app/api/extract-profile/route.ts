import { NextRequest, NextResponse } from "next/server";
import { AIService } from "@/lib/ai-service";
import { extractTextFromPdf, PdfValidationError } from "@/lib/pdf-extract";
import { supabaseServer } from "@/lib/supabase";
import { DEMO_PROFILE } from "@/data/demo-profile";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    const sessionId = req.headers.get("x-session-id") || "anonymous";

    let rawText: string | null = null;
    let source: "pdf" | "pasted_text" | "demo" = "pasted_text";
    let profile;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const mode = form.get("mode")?.toString();

      if (mode === "demo") {
        // Step 7: zero-setup demo path. Still a real RawProfile, just not AI-extracted.
        source = "demo";
        profile = DEMO_PROFILE;
      } else {
        const file = form.get("file") as File | null;
        if (!file) {
          return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
        }
        const buffer = Buffer.from(await file.arrayBuffer());
        rawText = await extractTextFromPdf(buffer);
        source = "pdf";
      }
    } else {
      const body = await req.json();
      if (!body.text || typeof body.text !== "string") {
        return NextResponse.json({ error: "Missing 'text' field." }, { status: 400 });
      }
      rawText = body.text;
      source = "pasted_text";
    }

    // AIService is the only place that talks to the model — extraction stays
    // separate from tailoring so the raw profile is reusable for other roles.
    if (!profile) {
      profile = await AIService.extractProfile(rawText as string);
    }

    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from("career_profiles")
      .insert({
        session_id: sessionId,
        source,
        raw_text: rawText,
        profile_json: profile,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: "Failed to save profile." }, { status: 500 });
    }

    return NextResponse.json({ careerProfileId: data.id, profile });
  } catch (err) {
    if (err instanceof PdfValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("extract-profile error:", err);
    const message = err instanceof Error ? err.message : "Extraction failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
