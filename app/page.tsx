"use client";

import { useCallback, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { PauseResumeWordmark } from "@/components/genforge/logo";
import { ProgressStepper } from "@/components/genforge/progress-stepper";
import { Landing } from "@/components/genforge/landing";
import { TemplateStep } from "@/components/TemplateStep";
import { TargetRoleStep } from "@/components/TargetRoleStep";
import { UploadStep } from "@/components/UploadStep";
import { ExtractionLoading } from "@/components/genforge/extraction-loading";
import { ReviewForm } from "@/components/ReviewForm";
import { ScoreStep } from "@/components/ScoreStep";
import { InterviewStep } from "@/components/InterviewStep";
import { ExportStep } from "@/components/ExportStep";
import { MyResumesView, SavedResumeSummary } from "@/components/genforge/my-resumes";
import { SaveAccountPrompt } from "@/components/genforge/save-account-prompt";
import { HeaderAuth } from "@/components/genforge/header-auth";
import { RawProfile, TailoredResume, TemplateId, CoverLetter } from "@/types/resume";
import { getOrCreateSessionId, supabaseBrowser, getAccessToken, signOut } from "@/lib/supabase";

type Stage = "landing" | "flow" | "dashboard";
type Step =
  | "template"
  | "target-role"
  | "upload"
  | "extracting"
  | "review"
  | "score"
  | "interview"
  | "export";

const STEP_NUMBER: Record<Step, number> = {
  template: 1,
  "target-role": 2,
  upload: 3,
  extracting: 3,
  review: 4,
  score: 5,
  interview: 6,
  export: 7,
};

export default function Home() {
  const [stage, setStage] = useState<Stage>("landing");
  const [step, setStep] = useState<Step>("template");
  const [templateId, setTemplateId] = useState<TemplateId>("classic");
  const [targetRole, setTargetRole] = useState("");
  const [careerProfileId, setCareerProfileId] = useState<string | null>(null);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [resume, setResume] = useState<TailoredResume | null>(null);
  const [coverLetter, setCoverLetter] = useState<CoverLetter | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // True while the target-role step is being used to re-tailor an
  // *existing* career profile for a new role, rather than as step 2 of the
  // normal upload-a-fresh-profile flow. Set by "Tailor for another role".
  const [isRetailoring, setIsRetailoring] = useState(false);

  // Optional auth — entirely separate from the resume-building flow above.
  // A person can go through the whole app and download without ever
  // touching this. Signing in only ever happens if they choose to.
  const [user, setUser] = useState<User | null>(null);
  const [savePromptDismissed, setSavePromptDismissed] = useState(false);

  const sessionId = typeof window !== "undefined" ? getOrCreateSessionId() : "server";

  // Sweeps any guest-built resumes (matched by sessionId) onto the now
  // signed-in account. Safe to call repeatedly — it only ever claims rows
  // that don't already have a user_id.
  const claimGuestResumes = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;
    try {
      await fetch("/api/claim-resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sessionId }),
      });
    } catch {
      // best-effort — a failed claim just means this resume stays a guest
      // resume for now; nothing in the current flow depends on it.
    }
  }, [sessionId]);

  useEffect(() => {
    const supabase = supabaseBrowser();
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "SIGNED_IN") {
        claimGuestResumes();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [claimGuestResumes]);

  const runExtractionAndTailoring = useCallback(
    async (opts: { formData?: FormData; text?: string; manualProfile?: RawProfile; demo?: boolean }) => {
      setStep("extracting");
      setReady(false);
      setError(null);
      try {
        let careerProfileIdLocal: string;
        let profile: RawProfile;

        if (opts.manualProfile) {
          const direct = await fetch("/api/manual-profile", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-session-id": sessionId },
            body: JSON.stringify({ profile: opts.manualProfile }),
          });
          const directJson = await direct.json();
          if (!direct.ok) throw new Error(directJson.error || "Failed to save manual profile.");
          careerProfileIdLocal = directJson.careerProfileId;
          profile = directJson.profile;
        } else {
          const form = opts.formData || new FormData();
          if (opts.demo) form.set("mode", "demo");

          const isJsonText = Boolean(opts.text) && !opts.formData;
          const res = await fetch("/api/extract-profile", {
            method: "POST",
            headers: isJsonText
              ? { "Content-Type": "application/json", "x-session-id": sessionId }
              : { "x-session-id": sessionId },
            body: isJsonText ? JSON.stringify({ text: opts.text }) : form,
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || "Extraction failed.");
          careerProfileIdLocal = json.careerProfileId;
          profile = json.profile;
        }

        setCareerProfileId(careerProfileIdLocal);

        const tailorRes = await fetch("/api/tailor-resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            careerProfileId: careerProfileIdLocal,
            targetRole,
            templateId,
            sessionId,
          }),
        });
        const tailorJson = await tailorRes.json();
        if (!tailorRes.ok) throw new Error(tailorJson.error || "Tailoring failed.");

        setResumeId(tailorJson.resumeId);
        setResume(tailorJson.resume);
        setReady(true);

        // Already signed in? Attach this brand-new resume to the account
        // right away instead of waiting for the next SIGNED_IN event.
        if (user) claimGuestResumes();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
        setStep("upload");
      }
    },
    [targetRole, templateId, sessionId, user, claimGuestResumes]
  );

  async function handleSubmitFile(file: File) {
    const form = new FormData();
    form.append("file", file);
    await runExtractionAndTailoring({ formData: form });
  }

  // Re-tailors an *existing* career profile (already on file) for a new
  // target role, skipping the upload/extraction step entirely — the whole
  // reason career_profiles and resumes are separate tables.
  async function runRetailor(role: string) {
    if (!careerProfileId) {
      setError("Missing profile — please import your profile again.");
      setStep("upload");
      return;
    }
    setStep("extracting");
    setReady(false);
    setError(null);
    setCoverLetter(null);
    try {
      const tailorRes = await fetch("/api/tailor-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ careerProfileId, targetRole: role, templateId, sessionId }),
      });
      const tailorJson = await tailorRes.json();
      if (!tailorRes.ok) throw new Error(tailorJson.error || "Tailoring failed.");

      setResumeId(tailorJson.resumeId);
      setResume(tailorJson.resume);
      setReady(true);
      if (user) claimGuestResumes();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStep("target-role");
    }
  }

  // Jumps straight to the target-role step reusing an already-imported
  // profile — used by "Tailor for another role" on the export screen and
  // on each card in My Resumes.
  function startRetailor(profileId: string, template?: TemplateId) {
    setCareerProfileId(profileId);
    setResumeId(null);
    setResume(null);
    setCoverLetter(null);
    setError(null);
    if (template) setTemplateId(template);
    setIsRetailoring(true);
    setStage("flow");
    setStep("target-role");
  }

  async function saveEdits(next: TailoredResume) {
    setResume(next);
    if (!resumeId) return;
    setSaveStatus("saving");
    try {
      await fetch(`/api/resumes/${resumeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: next }),
      });
      setSaveStatus("saved");
    } catch {
      setSaveStatus("idle");
    }
  }

  async function saveCoverLetter(letter: CoverLetter) {
    setCoverLetter(letter);
    if (!resumeId || !resume) return;
    try {
      await fetch(`/api/resumes/${resumeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, coverLetter: letter }),
      });
    } catch {
      // best-effort — the letter still lives in local state either way
    }
  }

  async function openSavedResume(summary: SavedResumeSummary) {
    setError(null);
    try {
      const res = await fetch(`/api/resumes/${summary.resumeId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't open that resume.");
      setResumeId(json.resumeId);
      setResume(json.resume);
      setCoverLetter(json.coverLetter ?? null);
      setCareerProfileId(summary.careerProfileId);
      setTemplateId(json.resume.templateId);
      setTargetRole(json.resume.targetRole);
      setStage("flow");
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open that resume.");
    }
  }

  function startNewResume() {
    setCareerProfileId(null);
    setResumeId(null);
    setResume(null);
    setCoverLetter(null);
    setTargetRole("");
    setTemplateId("classic");
    setError(null);
    setIsRetailoring(false);
    setStage("flow");
    setStep("template");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3">
          <button
            onClick={() => {
              setStage("landing");
              setStep("template");
            }}
            className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            aria-label="PauseResume home"
          >
            <PauseResumeWordmark />
          </button>

          {stage === "flow" && step !== "extracting" && (
            <div className="hidden max-w-2xl flex-1 sm:block">
              <ProgressStepper current={STEP_NUMBER[step]} />
            </div>
          )}

          <div className="flex shrink-0 items-center gap-3">
            {stage === "flow" && step !== "extracting" && (
              <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
                {String(STEP_NUMBER[step]).padStart(2, "0")} / 07
              </span>
            )}
            {user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStage("dashboard")}
                  className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-brand"
                >
                  My resumes
                </button>
                <button
                  onClick={async () => {
                    await signOut();
                    setStage("landing");
                  }}
                  className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <HeaderAuth />
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {stage === "landing" && (
          <Landing
            onStart={() => {
              setStage("flow");
              setStep("template");
            }}
          />
        )}

        {stage === "dashboard" && (
          <div className="mx-auto max-w-6xl px-6">
            <MyResumesView
              onOpen={openSavedResume}
              onNew={startNewResume}
              onRetailor={(summary) =>
                startRetailor(summary.careerProfileId, summary.templateId as TemplateId)
              }
            />
          </div>
        )}

        {stage === "flow" && (
          <div className="mx-auto max-w-6xl px-6">
            {error && (
              <div className="mx-auto mt-6 max-w-2xl rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            {step === "template" && (
              <TemplateStep
                onNext={(id) => {
                  setTemplateId(id);
                  setStep("target-role");
                }}
              />
            )}

            {step === "target-role" && (
              <TargetRoleStep
                retailoring={isRetailoring}
                onNext={(role) => {
                  setTargetRole(role);
                  if (isRetailoring) {
                    setIsRetailoring(false);
                    runRetailor(role);
                  } else {
                    setStep("upload");
                  }
                }}
              />
            )}

            {step === "upload" && (
              <UploadStep
                loading={false}
                onError={setError}
                onSubmitFile={handleSubmitFile}
                onDemo={() => runExtractionAndTailoring({ demo: true })}
                onExtracted={(payload) => {
                  if (payload.manualProfile) {
                    runExtractionAndTailoring({ manualProfile: payload.manualProfile });
                  } else if (payload.text) {
                    runExtractionAndTailoring({ text: payload.text });
                  }
                }}
              />
            )}

            {step === "extracting" && (
              <ExtractionLoading
                role={targetRole}
                ready={ready}
                onDone={() => setStep("review")}
              />
            )}

            {step === "review" && resume && (
              <ReviewForm
                resume={resume}
                resumeId={resumeId}
                onChange={saveEdits}
                onNext={() => setStep("score")}
                saveStatus={saveStatus}
              />
            )}

            {step === "score" && resume && (
              <ScoreStep
                resume={resume}
                resumeId={resumeId}
                onResumeImproved={(next) => saveEdits(next)}
                onNext={() => setStep("interview")}
              />
            )}

            {step === "interview" && resume && (
              <InterviewStep
                resume={resume}
                onNext={() => setStep("export")}
                onBack={() => setStep("score")}
              />
            )}

            {step === "export" && resume && (
              <>
                {!user && !savePromptDismissed && (
                  <div className="mb-6">
                    <SaveAccountPrompt onDismiss={() => setSavePromptDismissed(true)} />
                  </div>
                )}
                <ExportStep
                  resume={resume}
                  coverLetter={coverLetter}
                  onCoverLetterChange={saveCoverLetter}
                  onChangeTemplate={(id) => saveEdits({ ...resume, templateId: id })}
                  onBack={() => setStep("interview")}
                  onTailorAnotherRole={
                    careerProfileId
                      ? () => startRetailor(careerProfileId, resume.templateId)
                      : undefined
                  }
                />
              </>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-border/70 py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-xs text-muted-foreground">
          <span>PauseResume · Pause. Refine. Resume.</span>
          <span>AI-generated — review before you submit.</span>
        </div>
      </footer>
    </div>
  );
}
