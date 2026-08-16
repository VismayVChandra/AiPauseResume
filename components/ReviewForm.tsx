"use client";

import {
  ArrowRight,
  Plus,
  Trash2,
  Briefcase,
  GraduationCap,
  Wrench,
  FolderGit2,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineText, InlineTextarea } from "@/components/genforge/inline-field";
import { SourceBadge, type FieldSource } from "@/components/genforge/source-badge";
import { cn } from "@/lib/utils";
import {
  TailoredResume,
  Experience,
  Education,
  ProjectItem,
  Certification,
  TEMPLATE_OPTIONS,
} from "@/types/resume";

function srcOf(value: string, kind: Exclude<FieldSource, "empty">): FieldSource {
  return value && value.trim() ? kind : "empty";
}

export function ReviewForm({
  resume,
  onChange,
  onNext,
  saveStatus,
}: {
  resume: TailoredResume;
  onChange: (resume: TailoredResume) => void;
  onNext: () => void;
  saveStatus: "idle" | "saving" | "saved";
}) {
  function set<K extends keyof TailoredResume>(key: K, value: TailoredResume[K]) {
    onChange({ ...resume, [key]: value });
  }

  function updateExperience(i: number, patch: Partial<Experience>) {
    const next = [...resume.experience];
    next[i] = { ...next[i], ...patch };
    set("experience", next);
  }

  function updateEducation(i: number, patch: Partial<Education>) {
    const next = [...resume.education];
    next[i] = { ...next[i], ...patch };
    set("education", next);
  }

  function updateProject(i: number, patch: Partial<ProjectItem>) {
    const next = [...resume.projects];
    next[i] = { ...next[i], ...patch };
    set("projects", next);
  }

  function updateCert(i: number, patch: Partial<Certification>) {
    const next = [...resume.certifications];
    next[i] = { ...next[i], ...patch };
    set("certifications", next);
  }

  const emptyCount =
    (resume.summary ? 0 : 1) +
    (resume.experience.length ? 0 : 1) +
    (resume.education.length ? 0 : 1) +
    (resume.skills.length ? 0 : 1) +
    (resume.projects.length ? 0 : 1) +
    (resume.interests || resume.portfolioLink ? 0 : 1);

  return (
    <div className="mx-auto max-w-3xl py-10 sm:py-14 pb-20">
      <p className="font-mono text-xs uppercase tracking-widest text-brand">Step 4 of 7</p>
      <div className="mt-3 flex items-start justify-between gap-4">
        <h2 className="font-serif text-3xl leading-tight tracking-tight text-foreground sm:text-4xl">
          Review &amp; make it yours
        </h2>
        <span className="mt-2 shrink-0 text-xs text-muted-foreground">
          {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : ""}
        </span>
      </div>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
        Everything below is editable — just click a field. We&apos;ve marked where each piece
        came from.
      </p>

      <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        AI-generated content — please review every section for accuracy before submitting.
      </p>

      {resume.missingForRole.length > 0 && (
        <div className="mt-3 rounded-lg border border-linkedin-muted bg-linkedin-muted/40 px-3 py-2 text-xs text-linkedin">
          <b>Gaps for this role (not found in your profile):</b>
          <ul className="ml-4 mt-1 list-disc">
            {resume.missingForRole.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      {/* legend + template */}
      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-border bg-card px-4 py-3 text-xs">
        <SourceBadge source="linkedin" />
        <SourceBadge source="ai" />
        <SourceBadge source="empty" />
        {emptyCount > 0 && (
          <span className="text-muted-foreground">
            {emptyCount} {emptyCount === 1 ? "section" : "sections"} still open for you
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {TEMPLATE_OPTIONS.map((t) => (
            <button
              key={t.id}
              onClick={() => set("templateId", t.id)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                resume.templateId === t.id
                  ? "border-brand bg-brand-muted/50 text-brand"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* the sheet */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-paper shadow-[0_20px_60px_-30px_oklch(0.24_0.012_255/0.3)]">
        <header className="border-b border-border/70 bg-card/40 px-6 py-6 sm:px-8">
          <InlineText
            ariaLabel="Full name"
            value={resume.fullName}
            onChange={(v) => set("fullName", v)}
            placeholder="Your name"
            className="font-serif text-2xl tracking-tight sm:text-3xl"
          />
          <InlineText
            ariaLabel="Headline"
            value={resume.headline}
            onChange={(v) => set("headline", v)}
            placeholder="A short headline (e.g. Frontend Engineer)"
            className="mt-1 text-sm text-muted-foreground"
          />
          <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <InlineText
              ariaLabel="Email"
              value={resume.contact.email || ""}
              onChange={(v) => set("contact", { ...resume.contact, email: v })}
              placeholder="Email"
              className="text-sm"
            />
            <InlineText
              ariaLabel="Phone"
              value={resume.contact.phone || ""}
              onChange={(v) => set("contact", { ...resume.contact, phone: v })}
              placeholder="Phone (optional)"
              className="text-sm"
            />
            <InlineText
              ariaLabel="Location"
              value={resume.contact.location || ""}
              onChange={(v) => set("contact", { ...resume.contact, location: v })}
              placeholder="Location"
              className="text-sm"
            />
            <InlineText
              ariaLabel="LinkedIn"
              value={resume.contact.linkedin || ""}
              onChange={(v) => set("contact", { ...resume.contact, linkedin: v })}
              placeholder="LinkedIn URL"
              className="text-sm"
            />
          </div>
        </header>

        <div className="flex flex-col gap-8 px-6 py-7 sm:px-8">
          {/* Summary */}
          <Section icon={Sparkles} title="Summary" source={srcOf(resume.summary, "ai")}>
            <InlineTextarea
              ariaLabel="Professional summary"
              value={resume.summary}
              onChange={(v) => set("summary", v)}
              placeholder="A two-line summary tuned to the role you're targeting."
              className="text-sm"
            />
          </Section>

          {/* Experience */}
          <Section
            icon={Briefcase}
            title="Experience"
            onAdd={() =>
              set("experience", [
                ...resume.experience,
                { company: "", title: "", bullets: [""] },
              ])
            }
            addLabel="Add role"
          >
            <div className="flex flex-col gap-5">
              {resume.experience.length === 0 && (
                <EmptyRow text="No experience yet — add your first role." />
              )}
              {resume.experience.map((exp, i) => (
                <div
                  key={i}
                  className="group relative -mx-3 rounded-lg border border-transparent p-3 transition-colors hover:border-border hover:bg-card/60"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <InlineText
                        ariaLabel="Role title"
                        value={exp.title}
                        onChange={(v) => updateExperience(i, { title: v })}
                        placeholder="Role / title"
                        className="font-medium"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <SourceBadge source={srcOf(exp.title, "linkedin")} />
                      <RemoveButton
                        label="Remove role"
                        onClick={() =>
                          set(
                            "experience",
                            resume.experience.filter((_, x) => x !== i)
                          )
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-[1fr_auto]">
                    <InlineText
                      ariaLabel="Company"
                      value={exp.company}
                      onChange={(v) => updateExperience(i, { company: v })}
                      placeholder="Company"
                      className="text-sm text-muted-foreground"
                    />
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <InlineText
                        ariaLabel="Start date"
                        value={exp.startDate || ""}
                        onChange={(v) => updateExperience(i, { startDate: v })}
                        placeholder="Start"
                        className="w-20 text-xs"
                      />
                      <span aria-hidden>–</span>
                      <InlineText
                        ariaLabel="End date"
                        value={exp.endDate || ""}
                        onChange={(v) => updateExperience(i, { endDate: v })}
                        placeholder="End"
                        className="w-20 text-xs"
                      />
                    </div>
                  </div>
                  <ul className="mt-2 flex flex-col gap-1">
                    {exp.bullets.map((b, bi) => (
                      <li key={bi} className="flex items-start gap-2">
                        <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-brand" />
                        <InlineTextarea
                          ariaLabel={`Bullet ${bi + 1}`}
                          value={b}
                          onChange={(v) => {
                            const bullets = [...exp.bullets];
                            bullets[bi] = v;
                            updateExperience(i, { bullets });
                          }}
                          placeholder="Describe an accomplishment…"
                          className="text-sm"
                        />
                        {exp.bullets.length > 1 && (
                          <RemoveButton
                            label="Remove bullet"
                            small
                            onClick={() => {
                              const bullets = exp.bullets.filter((_, x) => x !== bi);
                              updateExperience(i, { bullets });
                            }}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => updateExperience(i, { bullets: [...exp.bullets, ""] })}
                    className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-brand"
                  >
                    <Plus className="h-3 w-3" /> Add bullet
                  </button>
                </div>
              ))}
            </div>
          </Section>

          {/* Education */}
          <Section
            icon={GraduationCap}
            title="Education"
            onAdd={() =>
              set("education", [...resume.education, { institution: "", degree: "" }])
            }
            addLabel="Add school"
          >
            <div className="flex flex-col gap-4">
              {resume.education.length === 0 && <EmptyRow text="Add your school and degree." />}
              {resume.education.map((edu, i) => (
                <div
                  key={i}
                  className="group -mx-3 rounded-lg border border-transparent p-3 transition-colors hover:border-border hover:bg-card/60"
                >
                  <div className="flex items-start justify-between gap-2">
                    <InlineText
                      ariaLabel="School"
                      value={edu.institution}
                      onChange={(v) => updateEducation(i, { institution: v })}
                      placeholder="School"
                      className="font-medium"
                    />
                    <div className="flex items-center gap-2">
                      <SourceBadge source={srcOf(edu.institution, "linkedin")} />
                      <RemoveButton
                        label="Remove school"
                        onClick={() =>
                          set(
                            "education",
                            resume.education.filter((_, x) => x !== i)
                          )
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-[1fr_auto]">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <InlineText
                        ariaLabel="Degree"
                        value={edu.degree || ""}
                        onChange={(v) => updateEducation(i, { degree: v })}
                        placeholder="Degree"
                        className="w-20 text-sm"
                      />
                      <InlineText
                        ariaLabel="Field of study"
                        value={edu.field || ""}
                        onChange={(v) => updateEducation(i, { field: v })}
                        placeholder="Field of study"
                        className="text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <InlineText
                        ariaLabel="Start year"
                        value={edu.startDate || ""}
                        onChange={(v) => updateEducation(i, { startDate: v })}
                        placeholder="Start"
                        className="w-16 text-xs"
                      />
                      <span aria-hidden>–</span>
                      <InlineText
                        ariaLabel="End year"
                        value={edu.endDate || ""}
                        onChange={(v) => updateEducation(i, { endDate: v })}
                        placeholder="End"
                        className="w-16 text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Skills */}
          <Section icon={Wrench} title="Skills">
            <div className="flex flex-wrap items-center gap-2">
              {resume.skills.map((skill, i) => (
                <span
                  key={i}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-brand-muted bg-brand-muted/50 px-3 py-1 text-sm text-brand"
                >
                  {skill}
                  <button
                    onClick={() =>
                      set(
                        "skills",
                        resume.skills.filter((_, x) => x !== i)
                      )
                    }
                    aria-label={`Remove ${skill}`}
                    className="opacity-50 transition-opacity hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                aria-label="Add a skill"
                placeholder="+ Add skill"
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing || e.key !== "Enter") return;
                  const v = e.currentTarget.value.trim();
                  if (v) {
                    set("skills", [...resume.skills, v]);
                    e.currentTarget.value = "";
                  }
                }}
                className="w-28 rounded-full border border-dashed border-border bg-transparent px-3 py-1 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/15"
              />
            </div>
          </Section>

          {/* Projects */}
          <Section
            icon={FolderGit2}
            title="Projects"
            onAdd={() =>
              set("projects", [...resume.projects, { name: "", bullets: [] }])
            }
            addLabel="Add project"
          >
            <div className="flex flex-col gap-4">
              {resume.projects.length === 0 && (
                <EmptyRow text="Add a project, side build, or hackathon." />
              )}
              {resume.projects.map((proj, i) => (
                <div
                  key={i}
                  className="group -mx-3 rounded-lg border border-transparent p-3 transition-colors hover:border-border hover:bg-card/60"
                >
                  <div className="flex items-start justify-between gap-2">
                    <InlineText
                      ariaLabel="Project name"
                      value={proj.name}
                      onChange={(v) => updateProject(i, { name: v })}
                      placeholder="Project name"
                      className="font-medium"
                    />
                    <div className="flex items-center gap-2">
                      <SourceBadge source={srcOf(proj.name, "linkedin")} />
                      <RemoveButton
                        label="Remove project"
                        onClick={() =>
                          set(
                            "projects",
                            resume.projects.filter((_, x) => x !== i)
                          )
                        }
                      />
                    </div>
                  </div>
                  <InlineTextarea
                    ariaLabel="Project description"
                    value={proj.description || ""}
                    onChange={(v) => updateProject(i, { description: v })}
                    placeholder="What it does and what you built."
                    className="text-sm"
                  />
                  <InlineText
                    ariaLabel="Project link"
                    value={proj.link || ""}
                    onChange={(v) => updateProject(i, { link: v })}
                    placeholder="Link (optional)"
                    className="text-xs text-linkedin"
                  />
                </div>
              ))}
            </div>
          </Section>

          {/* Certifications */}
          {resume.certifications.length > 0 && (
            <Section icon={Sparkles} title="Certifications">
              <div className="flex flex-col gap-3">
                {resume.certifications.map((c, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <InlineText
                      ariaLabel="Certification name"
                      value={c.name}
                      onChange={(v) => updateCert(i, { name: v })}
                      placeholder="Certification"
                      className="text-sm font-medium"
                    />
                    <InlineText
                      ariaLabel="Issuer"
                      value={c.issuer || ""}
                      onChange={(v) => updateCert(i, { issuer: v })}
                      placeholder="Issuer"
                      className="text-sm text-muted-foreground"
                    />
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Extras */}
          <Section icon={Plus} title="Extras" hint="Not on LinkedIn — worth adding">
            <div className="flex flex-col gap-4">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <label className="text-xs font-medium text-foreground">Portfolio / website</label>
                  <SourceBadge source={srcOf(resume.portfolioLink, "ai")} />
                </div>
                <InlineText
                  ariaLabel="Portfolio link"
                  value={resume.portfolioLink}
                  onChange={(v) => set("portfolioLink", v)}
                  placeholder="yoursite.com"
                  className="text-sm text-linkedin"
                />
              </div>
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <label className="text-xs font-medium text-foreground">
                    Interests &amp; hobbies
                  </label>
                  <SourceBadge source={srcOf(resume.interests, "ai")} />
                </div>
                <InlineTextarea
                  ariaLabel="Interests and hobbies"
                  value={resume.interests}
                  onChange={(v) => set("interests", v)}
                  placeholder="Things you're into outside of work."
                  className="text-sm"
                />
              </div>
            </div>
          </Section>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Button size="lg" onClick={onNext}>
          Looks good — see my score
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/* ---------- section wrapper ---------- */

function Section({
  icon: Icon,
  title,
  children,
  source,
  onAdd,
  addLabel,
  hint,
}: {
  icon: typeof Briefcase;
  title: string;
  children: React.ReactNode;
  source?: FieldSource;
  onAdd?: () => void;
  addLabel?: string;
  hint?: string;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
        <h3 className="font-mono text-xs font-medium uppercase tracking-widest text-foreground">
          {title}
        </h3>
        {source && <SourceBadge source={source} />}
        {hint && <span className="text-xs text-muted-foreground">· {hint}</span>}
        {onAdd && (
          <button
            onClick={onAdd}
            className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand transition-colors hover:bg-brand-muted/50"
          >
            <Plus className="h-3.5 w-3.5" />
            {addLabel ?? "Add"}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
      {text}
    </p>
  );
}

function RemoveButton({
  onClick,
  label,
  small,
}: {
  onClick: () => void;
  label: string;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100",
        small ? "mt-1 h-5 w-5" : "h-7 w-7"
      )}
    >
      <Trash2 className={small ? "h-3 w-3" : "h-3.5 w-3.5"} />
    </button>
  );
}
