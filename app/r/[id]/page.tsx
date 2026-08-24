import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { ResumePdfDocument } from "@/lib/pdf-template";
import { TailoredResumeSchema } from "@/lib/schemas";
import { supabaseServer } from "@/lib/supabase";
import { PauseResumeWordmark } from "@/components/genforge/logo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // always reflects the resume's current is_public state

async function loadPublicResume(id: string) {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("resumes")
    .select("resume_json, is_public")
    .eq("id", id)
    .eq("is_public", true)
    .single();

  if (error || !data) return null;

  const parsed = TailoredResumeSchema.safeParse(data.resume_json);
  if (!parsed.success) return null;
  return parsed.data;
}

export default async function PublicResumePage({ params }: { params: { id: string } }) {
  const resume = await loadPublicResume(params.id);

  if (!resume) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <PauseResumeWordmark />
        <p className="text-sm text-muted-foreground">
          This resume isn&apos;t shared (or the link is no longer valid).
        </p>
      </div>
    );
  }

  const buffer = await renderToBuffer(
    React.createElement(ResumePdfDocument, { resume }) as React.ReactElement<
      import("@react-pdf/renderer").DocumentProps
    >
  );
  const dataUrl = `data:application/pdf;base64,${buffer.toString("base64")}`;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border/70 px-6 py-3">
        <PauseResumeWordmark />
      </header>
      <main className="flex-1 p-4 sm:p-8">
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-sm text-muted-foreground">
            {resume.fullName}&apos;s resume, tailored for {resume.targetRole || "a role"} —
            shared read-only via PauseResume.
          </p>
          <embed
            src={dataUrl}
            type="application/pdf"
            className="h-[85vh] w-full rounded-lg border border-border"
          />
        </div>
      </main>
    </div>
  );
}
