import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { verifyResumeAccess } from "@/lib/resume-access";
import { z } from "zod";

export const runtime = "nodejs";

// Application-tracking metadata (status/company/date/notes/persona label)
// — separate from the main resume PATCH since this is user-entered
// bookkeeping, not part of the AI-validated TailoredResume shape.
const BodySchema = z.object({
  status: z.enum(["not_applied", "applied", "interviewing", "offer", "rejected"]).optional(),
  companyName: z.string().max(200).nullable().optional(),
  appliedAt: z.string().nullable().optional(), // ISO date string, or null to clear
  notes: z.string().max(2000).nullable().optional(),
  personaLabel: z.string().max(80).nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!(await verifyResumeAccess(req, params.id))) {
      return NextResponse.json({ error: "Resume not found." }, { status: 404 });
    }

    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: `Invalid tracker payload: ${parsed.error.message}` },
        { status: 400 }
      );
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (parsed.data.status !== undefined) update.application_status = parsed.data.status;
    if (parsed.data.companyName !== undefined) update.company_name = parsed.data.companyName;
    if (parsed.data.appliedAt !== undefined) update.applied_at = parsed.data.appliedAt;
    if (parsed.data.notes !== undefined) update.tracker_notes = parsed.data.notes;
    if (parsed.data.personaLabel !== undefined) update.persona_label = parsed.data.personaLabel;

    const supabase = supabaseServer();
    const { error } = await supabase.from("resumes").update(update).eq("id", params.id);

    if (error) {
      console.error("tracker update error:", error);
      return NextResponse.json({ error: "Failed to save tracker info." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("tracker update error:", err);
    return NextResponse.json({ error: "Failed to save tracker info." }, { status: 500 });
  }
}
