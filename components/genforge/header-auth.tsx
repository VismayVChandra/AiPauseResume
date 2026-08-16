"use client";

import { useState } from "react";
import { Check, Loader2, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendMagicLink } from "@/lib/supabase";

// Compact "Sign in / Sign up" corner widget. Entirely optional — the whole
// app works for guests without ever touching this. Same magic-link flow as
// SaveAccountPrompt, just collapsed into a header-sized popover so people
// who already have a saved resume can jump straight to it up front.
export function HeaderAuth({ onOpenDashboard }: { onOpenDashboard?: () => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (!email.trim() || !email.includes("@")) {
      setError("Enter a valid email first.");
      return;
    }
    setStatus("sending");
    setError(null);
    const { error: sendError } = await sendMagicLink(email.trim());
    if (sendError) {
      setError(sendError);
      setStatus("error");
      return;
    }
    setStatus("sent");
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand"
      >
        <UserIcon className="h-3.5 w-3.5" />
        Sign in / Sign up
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-72 rounded-xl border border-border bg-card p-4 shadow-lg">
          {status === "sent" ? (
            <div className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Check your inbox — we sent a sign-in link to {email}. Click it to access your
                saved resumes.
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs font-medium text-foreground">
                Sign in to access resumes you&apos;ve saved
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                Totally optional — no account needed to build or download a resume. This is just
                a shortcut back to ones you&apos;ve already saved.
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/15"
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
                <Button size="sm" onClick={handleSend} disabled={status === "sending"}>
                  {status === "sending" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Email me a sign-in link"
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
