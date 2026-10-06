"use client";

import { createContext, useContext, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const CloseContext = createContext<() => void>(() => {});

/** Forms inside a Disclosure can call this after a successful save. */
export function useCloseDisclosure() {
  return useContext(CloseContext);
}

/** Inline "＋ Add …" that expands into a form; keeps pages calm instead of one giant form. */
export function Disclosure({
  label,
  children,
  variant = "ghost",
}: {
  label: string;
  children: React.ReactNode;
  variant?: "ghost" | "secondary";
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button variant={variant} onClick={() => setOpen(true)}>
        <Plus className="size-3.5" />
        {label}
      </Button>
    );
  }
  return (
    <CloseContext.Provider value={() => setOpen(false)}>
      <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        {children}
        <button type="button" onClick={() => setOpen(false)} className="mt-2 text-sm text-fg-3 hover:text-fg">
          Отмена
        </button>
      </div>
    </CloseContext.Provider>
  );
}
