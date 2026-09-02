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
      <rect x="7.5" y="9.5" width="7" height="13" rx="3" fill="var(--brand-foreground)" />
      <path
        d="M17.5,12.5 L17.5,19.5 Q17.5,22.5 19.7,20.46 L22.3,18.04 Q24.5,16 22.3,13.96 L19.7,11.54 Q17.5,9.5 17.5,12.5 Z"
        fill="var(--brand-foreground)"
      />
    </svg>
  );
}

// Google's own multi-colour "G" mark — unlike LinkedInGlyph this can't use
// currentColor, the four brand colours are the whole point of it being
// recognizable as the Google button.
export function GoogleGlyph({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className={cn("h-4 w-4", className)}
      {...props}
    >
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5Z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7Z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.6-3.1-11.3-7.5l-6.5 5C9.5 39.6 16.2 44 24 44Z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.6l6.2 5.2C39.9 36.6 44 31 44 24c0-1.3-.1-2.7-.4-3.5Z"
      />
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
