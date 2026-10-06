import type { Software } from "@prisma/client";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

const tones: Record<Tone, string> = {
  neutral: "bg-muted text-fg-2",
  accent: "bg-accent-soft text-accent",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-sm px-1.5 text-xs font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export const SOFTWARE_LABEL: Record<Software, string> = {
  PHOTOSHOP: "Photoshop",
  ILLUSTRATOR: "Illustrator",
  FIGMA: "Figma",
  GENERAL: "Общее",
};

const SOFTWARE_SHORT: Record<Software, string> = {
  PHOTOSHOP: "Ps",
  ILLUSTRATOR: "Ai",
  FIGMA: "Fg",
  GENERAL: "⌘",
};

/** Mono app glyph, Adobe-style but brand-neutral. */
export function SoftwareMark({ software, className }: { software: Software; className?: string }) {
  return (
    <span
      title={SOFTWARE_LABEL[software]}
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-[5px] border border-border-strong bg-surface font-mono text-[10px] font-semibold text-fg-2",
        className,
      )}
    >
      {SOFTWARE_SHORT[software]}
    </span>
  );
}

export function SoftwareLabel({ software }: { software: Software }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-fg-2">
      <SoftwareMark software={software} />
      {SOFTWARE_LABEL[software]}
    </span>
  );
}
