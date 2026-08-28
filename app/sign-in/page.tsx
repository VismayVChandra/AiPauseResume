"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendMagicLink } from "@/lib/supabase";
import { PauseResumeWordmark } from "@/components/genforge/logo";
import { ThemeToggle } from "@/components/genforge/theme-toggle";

// A real page rather than the old header-corner popover — the popover
// worked fine on desktop but had nowhere good to lay itself out on a
// narrow phone screen, floating over whatever the person was doing
// underneath it. Same magic-link flow either way; this only changes
// where it lives. There's no separate "sign up" form because there's
// nothing to separate — Supabase's magic link creates the account on
// first use, so one email field covers both.
export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
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
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border/70 px-6 py-4">
        <Link href="/">
          <PauseResumeWordmark />
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to PauseResume
          </Link>

          <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            {status === "sent" ? (
              <div className="flex flex-col items-center gap-3 py-2 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-muted/60">
                  <Check className="h-5 w-5 text-brand" />
                </span>
                <h1 className="font-serif text-xl text-foreground">Check your inbox</h1>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  We sent a sign-in link to{" "}
                  <span className="font-medium text-foreground">{email}</span>. Click it to access
                  resumes you&apos;ve saved.
                </p>
                <button
                  onClick={() => {
                    setStatus("idle");
                    setEmail("");
                  }}
                  className="mt-1 text-xs font-medium text-brand hover:underline"
                >
                  Use a different email
                </button>
              </div>
            ) : (
              <>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-muted/60">
                  <Mail className="h-5 w-5 text-brand" />
                </span>
                <h1 className="mt-4 font-serif text-2xl leading-tight text-foreground">
                  Sign in to PauseResume
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Totally optional — you never need an account to build, score, or download a
                  resume. Signing in just gives you a way back to resumes you&apos;ve already
                  saved, from any device.
                </p>

                <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
                  <label htmlFor="signin-email" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="signin-email"
                    type="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/15"
                  />
                  {error && <p className="text-xs text-destructive">{error}</p>}
                  <Button
                    type="submit"
                    size="lg"
                    disabled={status === "sending"}
                    className="w-full justify-center"
                  >
                    {status === "sending" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Email me a sign-in link"
                    )}
                  </Button>
                </form>

                <p className="mt-4 text-center text-[11px] text-muted-foreground">
                  No password needed — we&apos;ll email you a one-time link instead.
                </p>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
