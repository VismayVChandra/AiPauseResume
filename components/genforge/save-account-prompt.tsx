"use client";

import { useState } from "react";
import { Mail, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendMagicLink } from "@/lib/supabase";

export function SaveAccountPrompt({ onDismiss }: { onDismiss: () => void }) {
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

  if (status === "sent") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-brand/25 bg-brand-muted/25 p-4">
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Check your inbox</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            We sent a sign-in link to {email}. Click it and this resume — and anything else you
            build today — will be saved to your account automatically.
          </p>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand">
            <Mail className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">
              Applying to more than one role?
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Sign in to save this resume and pick up where you left off next time —
              entirely optional, your download works either way.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="w-44 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/15"
          />
          <Button size="sm" onClick={handleSend} disabled={status === "sending"}>
            {status === "sending" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Sign in"}
          </Button>
          <button
            onClick={onDismiss}
            aria-label="No thanks, dismiss"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
