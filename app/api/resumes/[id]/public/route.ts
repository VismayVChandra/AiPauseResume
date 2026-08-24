import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { z } from "zod";

export const runtime = "nodejs";

const BodySchema = z.object({ isPublic: z.boolean() });

// Toggles whether a resume is reachable at the read-only /r/[id] share
// page. Off by default (see supabase/schema.sql) — this is the only way
// it turns on, and it's explicit, one resume at a time.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const supabase = supabaseServer();
    const { error } = await supabase
      .from("resumes")
      .update({ is_public: parsed.data.isPublic })
      .eq("id", params.id);

    if (error) {
      console.error("public toggle error:", error);
      return NextResponse.json({ error: "Failed to update sharing." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, isPublic: parsed.data.isPublic });
  } catch (err) {
    console.error("public toggle error:", err);
    return NextResponse.json({ error: "Failed to update sharing." }, { status: 500 });
  }
}
