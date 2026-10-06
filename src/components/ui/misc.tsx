import { cn } from "@/lib/utils";

export function Panel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border border-border bg-surface", className)} {...props} />;
}

export function SectionTitle({
  children,
  action,
  className,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-4", className)}>
      <h2 className="text-xs font-medium tracking-wide text-fg-3 uppercase">{children}</h2>
      {action}
    </div>
  );
}

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-6 min-w-6 items-center justify-center rounded-[5px] border border-border-strong border-b-2 bg-surface px-1.5 font-mono text-xs font-medium text-fg",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/** "Ctrl+Shift+Z" → <Kbd>Ctrl</Kbd>+<Kbd>Shift</Kbd>+<Kbd>Z</Kbd> */
export function KeyCombo({ combo, size = "md" }: { combo: string; size?: "md" | "lg" }) {
  const parts = combo.split(/\+(?!$)/);
  return (
    <span className="inline-flex items-center gap-1">
      {parts.map((p, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && <span className="text-xs text-fg-3">+</span>}
          <Kbd className={size === "lg" ? "h-10 min-w-10 rounded-md px-3 text-base" : undefined}>{p}</Kbd>
        </span>
      ))}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-dashed border-border-strong px-6 py-10 text-center", className)}>
      <p className="font-medium text-fg">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-sm text-sm text-fg-2">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 text-sm text-fg-3">{eyebrow}</div>}
        <h1 className="text-xl font-semibold tracking-display text-fg">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-base text-fg-2">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-fg-3">{label}</div>
      <div className="mt-0.5 font-mono text-lg font-medium tnum text-fg">{value}</div>
      {hint && <div className="text-xs text-fg-3">{hint}</div>}
    </div>
  );
}
