"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form";

/** Submit button + inline result for useActionState forms. */
export function SaveBar({
  pending,
  state,
  label = "Сохранить",
  className,
}: {
  pending: boolean;
  state: { error?: string; ok?: boolean } | undefined;
  label?: string;
  className?: string;
}) {
  const [showOk, setShowOk] = useState(false);
  useEffect(() => {
    if (state?.ok) {
      setShowOk(true);
      const t = setTimeout(() => setShowOk(false), 2000);
      return () => clearTimeout(t);
    }
  }, [state]);
  return (
    <div className={className}>
      <FormError message={state?.error} />
      <div className="mt-3 flex items-center justify-end gap-3">
        {showOk && !pending && (
          <span className="inline-flex items-center gap-1 text-sm text-success">
            <Check className="size-3.5" /> Сохранено
          </span>
        )}
        <Button variant="primary" disabled={pending}>
          {pending ? "Сохраняем…" : label}
        </Button>
      </div>
    </div>
  );
}
