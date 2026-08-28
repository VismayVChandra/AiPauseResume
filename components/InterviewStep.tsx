"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Lightbulb,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Mic,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkedInGlyph } from "@/components/genforge/logo";
import { cn } from "@/lib/utils";
import { InterviewAnswerFeedback, InterviewQuestion, TailoredResume } from "@/types/resume";

// A small, cheerful multi-color accent set (Google-tab-style) used to give
// each question card a distinct identity in the grid.
const ACCENTS = ["#4285F4", "#EA4335", "#FBBC05", "#34A853"];

export function InterviewStep({
  resume,
  onNext,
  onBack,
}: {
  resume: TailoredResume;
  onNext: () => void;
  onBack: () => void;
}) {
  const [questions, setQuestions] = useState<InterviewQuestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateQuestions() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/interview-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't generate questions.");
      setQuestions(json.questions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't generate questions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    generateQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-6xl py-10 sm:py-14">
      <p className="font-mono text-xs uppercase tracking-widest text-brand">Step 6 of 7</p>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl leading-tight tracking-tight text-foreground sm:text-4xl">
            Interview prep
          </h2>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
            Likely questions for <b className="text-foreground">{resume.targetRole || "this role"}</b>,
            grounded in what&apos;s actually on your resume — plus a tip for each.
          </p>
        </div>
        {questions && (
          <button
            onClick={generateQuestions}
            disabled={loading}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            {loading ? "Regenerating…" : "Regenerate"}
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && !questions && (
        <div className="mt-10 flex flex-col items-center gap-3 py-16 text-sm text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin text-brand" />
          Thinking through what they&apos;ll ask…
        </div>
      )}

      {questions && (
        <ol className="mt-8 grid grid-cols-1 items-start gap-5 md:grid-cols-2">
          {questions.map((q, i) => {
            const accent = ACCENTS[i % ACCENTS.length];
            return (
              <li
                key={i}
                className="relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex h-1.5">
                  {ACCENTS.map((c, j) => (
                    <span key={j} className="h-full flex-1" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div className="flex items-start gap-3 p-5">
                  <span
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold text-white"
                    style={{ backgroundColor: accent }}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-snug text-foreground">
                      {q.question}
                    </p>
                    <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                      <LinkedInGlyph className="mt-0.5 h-3 w-3 shrink-0 text-linkedin" />
                      <span>{q.basedOn}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 border-t border-border bg-muted/40 px-5 py-3">
                  <Lightbulb
                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                    style={{ color: accent }}
                    strokeWidth={2}
                  />
                  <p className="text-xs leading-relaxed text-foreground/80">{q.tip}</p>
                </div>

                <AnswerPractice question={q.question} resume={resume} />
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-10 flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to score
        </Button>
        <Button size="lg" onClick={onNext}>
          Continue to export
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Mock-interview mode: type an answer to a question, get it judged against
// the STAR framework, grounded in what was actually written (plus the
// resume for context) — never a stronger version of events than given.
// Minimal ambient shape for the Web Speech API — not in TS's default DOM
// lib, and only Chrome/Edge/Safari ship it (no Firefox), so every use is
// feature-detected before touching `window`.
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: any) => void) | null; // eslint-disable-line @typescript-eslint/no-explicit-any
  onerror: ((event: any) => void) | null; // eslint-disable-line @typescript-eslint/no-explicit-any
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (
    ((w.SpeechRecognition || w.webkitSpeechRecognition) as
      | (new () => SpeechRecognitionLike)
      | undefined) || null
  );
}

function AnswerPractice({ question, resume }: { question: string; resume: TailoredResume }) {
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<InterviewAnswerFeedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [recording, setRecording] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTextRef = useRef(""); // answer text as it stood when recording started
  const finalTranscriptRef = useRef(""); // confirmed (non-interim) speech since recording started
  // Chrome/Edge can fire `onend` on their own after a short silence even
  // with continuous:true set — without this flag, that reads as "the user
  // stopped" and the mic gives up after ~1s despite still being wanted.
  const stoppedByUserRef = useRef(true);

  useEffect(() => {
    setMicSupported(getSpeechRecognitionCtor() !== null);
    return () => {
      stoppedByUserRef.current = true;
      recognitionRef.current?.stop();
    };
  }, []);

  function toggleMic() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    if (recording) {
      stoppedByUserRef.current = true;
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }

    setMicError(null);
    baseTextRef.current = answer.trim() ? answer.trim() + " " : "";
    finalTranscriptRef.current = "";

    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += transcript;
        else interim += transcript;
      }
      if (final) finalTranscriptRef.current += final + " ";
      setAnswer(baseTextRef.current + finalTranscriptRef.current + interim);
    };

    recognition.onerror = (event) => {
      const reason = event?.error as string | undefined;
      // "no-speech" just means it hasn't heard anything yet — onend fires
      // right after this and the auto-restart below picks it back up, so
      // this isn't a real failure worth interrupting the user over.
      if (reason === "no-speech" || reason === "aborted") return;
      stoppedByUserRef.current = true;
      setMicError(
        reason === "not-allowed" || reason === "service-not-allowed"
          ? "Microphone access is blocked — check your browser's site permissions."
          : reason === "audio-capture"
            ? "No microphone found."
            : reason === "network"
              ? "Couldn't reach the speech recognition service. Brave blocks this by default — enable it under brave://settings/ (search \"speech\") and reload, or try Chrome/Edge instead."
              : "Voice input hit an error — try again."
      );
    };

    recognition.onend = () => {
      if (stoppedByUserRef.current) {
        setRecording(false);
        return;
      }
      // Not a deliberate stop — the browser ended the session on its own
      // (silence timeout, etc.). Resume transparently so "continuous"
      // actually behaves continuously instead of quitting after ~1s.
      try {
        recognition.start();
      } catch {
        setRecording(false);
      }
    };

    recognitionRef.current = recognition;
    stoppedByUserRef.current = false;
    recognition.start();
    setRecording(true);
  }

  async function getFeedback() {
    if (!answer.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/interview-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, answer, resume }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't get feedback.");
      setFeedback(json.feedback as InterviewAnswerFeedback);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't get feedback.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 border-t border-border px-5 py-2.5 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-brand"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Practice answering this one
      </button>
    );
  }

  return (
    <div className="border-t border-border px-5 py-3">
      <label htmlFor={`answer-${question.slice(0, 20)}`} className="sr-only">
        Your answer
      </label>
      <div className="relative">
        <textarea
          id={`answer-${question.slice(0, 20)}`}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={3}
          placeholder="Type your answer as you'd say it out loud, or use the mic…"
          className={cn(
            "w-full resize-none rounded-md border border-border bg-background py-2 pl-2.5 text-xs leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/60 focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/15",
            micSupported ? "pr-9" : "pr-2.5"
          )}
        />
        {micSupported && (
          <button
            type="button"
            onClick={toggleMic}
            aria-label={recording ? "Stop recording" : "Speak your answer"}
            title={recording ? "Stop recording" : "Speak your answer"}
            className={cn(
              "absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md transition-colors",
              recording
                ? "bg-destructive text-white animate-pulse"
                : "text-muted-foreground hover:bg-muted hover:text-brand"
            )}
          >
            {recording ? <Square className="h-3 w-3" /> : <Mic className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
      {recording && (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-brand">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
          Listening…
        </p>
      )}
      {micError && <p className="mt-1 text-[11px] text-destructive">{micError}</p>}
      <div className="mt-2 flex items-center justify-between">
        <button
          onClick={() => setOpen(false)}
          className="text-[11px] text-muted-foreground hover:text-foreground"
        >
          Hide
        </button>
        <Button size="sm" onClick={getFeedback} disabled={loading || !answer.trim()} className="gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          {loading ? "Reviewing…" : "Get feedback"}
        </Button>
      </div>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      {feedback && (
        <div className="mt-3 flex flex-col gap-2.5 rounded-lg border border-brand/20 bg-brand-muted/15 p-3">
          <p className="text-xs font-medium text-foreground">{feedback.starClarity}</p>

          {feedback.strengths.length > 0 && (
            <ul className="flex flex-col gap-1">
              {feedback.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs leading-relaxed text-foreground/85">
                  <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-brand" />
                  {s}
                </li>
              ))}
            </ul>
          )}

          {feedback.improvements.length > 0 && (
            <ul className="flex flex-col gap-1">
              {feedback.improvements.map((s, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs leading-relaxed text-foreground/85">
                  <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
                  {s}
                </li>
              ))}
            </ul>
          )}

          {feedback.suggestedRewrite && (
            <div className="rounded-md border border-border bg-card p-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Tightened version
              </p>
              <p className="mt-1 text-xs leading-relaxed text-foreground">{feedback.suggestedRewrite}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
