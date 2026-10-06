import { cn } from "@/lib/utils";

const control =
  "rounded-md border border-border bg-surface px-2.5 text-base text-fg placeholder:text-fg-3 transition-[border-color,box-shadow] duration-150 hover:border-border-strong focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/15 disabled:opacity-60";

/** Full width unless the caller sets its own width. */
const width = (className?: string) => (/(^|\s)(\w+:)?w-/.test(className ?? "") ? undefined : "w-full");

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, width(className), "h-9", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, width(className), "min-h-20 py-2 leading-relaxed", className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(control, width(className), "h-9 pr-8", className)} {...props} />;
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-sm font-medium text-fg">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-fg-3">{hint}</span>}
    </label>
  );
}

export function Checkbox({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-fg">
      <input type="checkbox" className="size-4 rounded accent-[var(--accent)]" {...props} />
      {label}
    </label>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{message}</p>;
}
