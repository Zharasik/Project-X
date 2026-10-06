"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";
import type { Software } from "@prisma/client";
import { saveHotkey, type ActionState } from "@/lib/actions/teacher";
import { comboFromEvent } from "@/lib/hotkeys";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select } from "@/components/ui/form";
import { SaveBar } from "./save-bar";
import { SOFTWARE_OPTIONS } from "./forms";

/** Click the field and press the combo — no need to type "Ctrl+Shift+…" by hand. */
function ComboInput({ name, defaultValue, placeholder }: { name: string; defaultValue?: string; placeholder: string }) {
  const [value, setValue] = useState(defaultValue ?? "");
  return (
    <Input
      name={name}
      value={value}
      placeholder={placeholder}
      className="font-mono"
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Tab" || e.key === "Backspace" || e.key === "Delete") return;
        const combo = comboFromEvent(e.nativeEvent);
        if (!combo) return;
        e.preventDefault();
        setValue(combo);
      }}
    />
  );
}

export function HotkeyForm({
  hotkey,
}: {
  hotkey?: { id: string; software: Software; action: string; keys: string; macKeys: string | null; published: boolean };
}) {
  const [editing, setEditing] = useState(!hotkey);
  const [formKey, setFormKey] = useState(0);
  const [state, action, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = await saveHotkey(hotkey?.id ?? null, prev, fd);
    if (r?.ok && hotkey) setEditing(false);
    if (r?.ok && !hotkey) setFormKey((k) => k + 1); // reset the "new" form
    return r;
  }, undefined);

  if (!editing) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setEditing(true)} aria-label="Изменить">
        <Pencil className="size-3.5" />
      </Button>
    );
  }
  return (
    <form action={action} className="w-full space-y-3" key={formKey}>
      <div className="grid gap-2 sm:grid-cols-[140px_minmax(0,1fr)_150px_150px]">
        <Select name="software" defaultValue={hotkey?.software ?? "PHOTOSHOP"} aria-label="Программа">
          {SOFTWARE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Input name="action" defaultValue={hotkey?.action} placeholder="Действие: «Отменить последнее действие»" required aria-label="Действие" />
        <ComboInput name="keys" defaultValue={hotkey?.keys} placeholder="Windows: Ctrl+Z" />
        <ComboInput name="macKeys" defaultValue={hotkey?.macKeys ?? ""} placeholder="macOS: Cmd+Z" />
      </div>
      {hotkey && <Checkbox name="published" label="Показывать студентам" defaultChecked={hotkey.published} />}
      <div className="flex items-center justify-end gap-2">
        {hotkey && (
          <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
            Отмена
          </Button>
        )}
        <SaveBar pending={pending} state={state} label={hotkey ? "Сохранить" : "Добавить"} className="[&>div]:mt-0" />
      </div>
    </form>
  );
}
