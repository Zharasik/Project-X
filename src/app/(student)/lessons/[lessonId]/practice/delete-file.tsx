"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { deleteSubmissionFile } from "@/lib/actions/student";

export function DeleteFileButton({ fileId }: { fileId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => deleteSubmissionFile(fileId))}
      className="text-fg-3 transition-colors hover:text-danger disabled:opacity-50"
      aria-label="Удалить файл"
    >
      <X className="size-3.5" />
    </button>
  );
}
