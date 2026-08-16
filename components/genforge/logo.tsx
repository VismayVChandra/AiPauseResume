import { cn } from "@/lib/utils";

// A rounded-square badge in the app's own --brand color, containing a
// white pause bar merging into a white play triangle — "pause, then
// resume" as a single glyph. Pure SVG so it stays crisp at any size,
// from a 20px header mark up to a large hero mark, with zero raster assets.
export function PauseResumeMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("h-6 w-6", className)}
    >
      <rect width="32" height="32" rx="8" fill="var(--brand)" />
      <rect x="9" y="9.5" width="5" height="13" rx="2.2" fill="var(--brand-foreground)" />
      <polygon points="18,9.5 18,22.5 27,16" fill="var(--brand-foreground)" />
    </svg>
  );
}

export function LinkedInGlyph({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={cn("h-4 w-4", className)}
      {...props}
    >
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm6 0h3.8v1.64h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.4c0-1.29-.02-2.95-1.8-2.95-1.8 0-2.08 1.4-2.08 2.85V21H9V9Z" />
    </svg>
  );
}

export function PauseResumeWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <PauseResumeMark className="h-7 w-7" />
      <span className="font-serif text-lg tracking-tight text-foreground">
        Pause<span className="text-brand">Resume</span>
      </span>
    </span>
  );
}
