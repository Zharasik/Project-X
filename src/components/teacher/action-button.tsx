"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

/** Runs a server action on click; optional confirm; shows thrown errors inline. */
export function ActionButton({
  action,
  confirm,
  children,
  variant = "ghost",
  size = "sm",
  className,
  title,
}: {
  action: () => Promise<unknown>;
  confirm?: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
  title?: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-end">
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        title={title}
        aria-label={title}
        disabled={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          setError(null);
          start(async () => {
            try {
              await action();
            } catch (e) {
              // redirect() throws a special error that must propagate
              if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) throw e;
              setError(e instanceof Error ? e.message : "Не удалось выполнить действие");
            }
          });
        }}
      >
        {children}
      </Button>
      {error && <span className="mt-1 max-w-64 text-right text-xs text-danger">{error}</span>}
    </span>
  );
}
