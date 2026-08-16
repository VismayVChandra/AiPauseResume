"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function InlineText({
  value,
  onChange,
  placeholder,
  className,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel: string;
}) {
  return (
    <input
      type="text"
      value={value}
      aria-label={ariaLabel}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "-mx-2 w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 hover:border-border hover:bg-card focus-visible:border-brand focus-visible:bg-card focus-visible:ring-4 focus-visible:ring-brand/15",
        className
      )}
    />
  );
}

export function InlineTextarea({
  value,
  onChange,
  placeholder,
  className,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      aria-label={ariaLabel}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "-mx-2 w-full resize-none overflow-hidden rounded-md border border-transparent bg-transparent px-2 py-1 leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 hover:border-border hover:bg-card focus-visible:border-brand focus-visible:bg-card focus-visible:ring-4 focus-visible:ring-brand/15",
        className
      )}
    />
  );
}
