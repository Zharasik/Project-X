"use client";

import { useActionState, useRef, useState } from "react";
import { Paperclip, Upload, X } from "lucide-react";
import { submitPractice } from "@/lib/actions/student";
import { formatBytes } from "@/lib/practice";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Textarea } from "@/components/ui/form";

export function SubmitPracticeForm({
  lessonId,
  allowUpload,
  resubmit,
  defaults,
}: {
  lessonId: string;
  allowUpload: boolean;
  resubmit: boolean;
  defaults: { comment: string; link: string };
}) {
  const [state, action, pending] = useActionState(submitPractice, undefined);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function sync(next: File[]) {
    setFiles(next);
    if (inputRef.current) {
      const dt = new DataTransfer();
      next.forEach((f) => dt.items.add(f));
      inputRef.current.files = dt.files;
    }
  }

  return (
    <form
      action={async (fd) => {
        await action(fd);
        sync([]);
      }}
      className="space-y-4"
    >
      <input type="hidden" name="lessonId" value={lessonId} />
      {allowUpload && (
        <div>
          <span className="mb-1.5 block text-sm font-medium">Файлы работы</span>
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              sync([...files, ...Array.from(e.dataTransfer.files)]);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-6 text-center transition-colors ${
              dragging ? "border-accent bg-accent-soft" : "border-border-strong hover:border-fg-3 hover:bg-muted"
            }`}
          >
            <Upload className="size-4 text-fg-3" />
            <span className="text-sm text-fg">Перетащите файлы или выберите на компьютере</span>
            <span className="text-xs text-fg-3">PNG, JPG, PDF, PSD, AI, ZIP · до 15 МБ</span>
            <input
              ref={inputRef}
              type="file"
              name="files"
              multiple
              className="sr-only"
              accept=".png,.jpg,.jpeg,.webp,.gif,.svg,.pdf,.zip,.psd,.ai"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
          </label>
          {files.length > 0 && (
            <ul className="mt-2 space-y-1">
              {files.map((f, i) => (
                <li key={i} className="flex items-center gap-2 rounded-md bg-muted px-2.5 py-1.5 text-sm">
                  <Paperclip className="size-3.5 text-fg-3" />
                  <span className="min-w-0 flex-1 truncate">{f.name}</span>
                  <span className="font-mono text-xs text-fg-3">{formatBytes(f.size)}</span>
                  <button type="button" onClick={() => sync(files.filter((_, j) => j !== i))} className="text-fg-3 hover:text-fg" aria-label="Убрать">
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <Field label="Ссылка на работу" hint="Необязательно: Behance, Google Drive, Figma…">
        <Input name="link" type="url" placeholder="https://" defaultValue={defaults.link} />
      </Field>
      <Field label="Комментарий для преподавателя">
        <Textarea name="comment" rows={3} defaultValue={defaults.comment} placeholder="Что получилось, что вызвало сложности" />
      </Field>
      <FormError message={state?.error} />
      {state?.ok && <p className="rounded-md bg-success-soft px-3 py-2 text-sm text-success">Работа отправлена на проверку.</p>}
      <div className="flex justify-end">
        <Button variant="primary" size="lg" disabled={pending}>
          {pending ? "Отправляем…" : resubmit ? "Отправить заново" : "Отметить как выполнено"}
        </Button>
      </div>
    </form>
  );
}
