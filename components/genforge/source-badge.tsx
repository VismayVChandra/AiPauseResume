import { Sparkles, CircleDashed } from "lucide-react";
import { LinkedInGlyph } from "@/components/genforge/logo";
import { cn } from "@/lib/utils";

export type FieldSource = "linkedin" | "ai" | "empty";

const config = {
  linkedin: {
    label: "From your profile",
    Icon: LinkedInGlyph,
    className: "bg-linkedin-muted text-linkedin",
  },
  ai: {
    label: "AI-tailored",
    Icon: Sparkles,
    className: "bg-brand-muted text-brand",
  },
  empty: {
    label: "Add yours",
    Icon: CircleDashed,
    className: "bg-muted text-muted-foreground",
  },
} as const;

export function SourceBadge({
  source,
  className,
}: {
  source: FieldSource;
  className?: string;
}) {
  const { label, Icon, className: tone } = config[source];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium leading-none tracking-wide",
        tone,
        className
      )}
    >
      <Icon className="h-3 w-3" strokeWidth={2} />
      {label}
    </span>
  );
}
