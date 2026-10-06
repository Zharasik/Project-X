import Link from "next/link";
import type { Metadata } from "next";
import type { Software } from "@prisma/client";
import { Trash2 } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteHotkey } from "@/lib/actions/teacher";
import { cn } from "@/lib/utils";
import { SOFTWARE_LABEL, SoftwareMark } from "@/components/ui/badge";
import { KeyCombo, PageHeader, Panel } from "@/components/ui/misc";
import { ActionButton } from "@/components/teacher/action-button";
import { HotkeyForm } from "@/components/teacher/hotkey-form";

export const metadata: Metadata = { title: "Горячие клавиши" };

const FILTERS: (Software | "ALL")[] = ["ALL", "PHOTOSHOP", "ILLUSTRATOR", "GENERAL", "FIGMA"];

export default async function TeacherHotkeysPage({ searchParams }: { searchParams: Promise<{ software?: string }> }) {
  await requireTeacher();
  const { software } = await searchParams;
  const active = FILTERS.includes(software as Software) ? (software as Software) : "ALL";
  const hotkeys = await db.hotkey.findMany({
    where: active === "ALL" ? {} : { software: active },
    orderBy: [{ software: "asc" }, { action: "asc" }],
    include: { _count: { select: { lessons: true } } },
  });

  return (
    <>
      <PageHeader title="Горячие клавиши" description="Общая библиотека сочетаний. Привязать их к теме можно во вкладке темы «Горячие клавиши»." />
      <Panel className="mb-6 p-4">
        <p className="mb-3 text-sm font-semibold">Новое сочетание</p>
        <HotkeyForm />
        <p className="mt-2 text-xs text-fg-3">Кликните в поле сочетания и нажмите клавиши — они запишутся сами.</p>
      </Panel>

      <div className="mb-3 flex gap-1 overflow-x-auto">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "ALL" ? "/teacher/hotkeys" : `/teacher/hotkeys?software=${f}`}
            className={cn("inline-flex h-8 shrink-0 items-center rounded-md px-3 text-sm", active === f ? "bg-fg text-bg" : "text-fg-2 hover:bg-muted")}
          >
            {f === "ALL" ? "Все" : SOFTWARE_LABEL[f]}
          </Link>
        ))}
      </div>

      <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
        {hotkeys.map((h) => (
          <li key={h.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
            <SoftwareMark software={h.software} />
            <span className={cn("min-w-0 flex-1 truncate text-sm", !h.published && "text-fg-3 line-through")}>{h.action}</span>
            <span className="hidden text-xs text-fg-3 sm:inline">
              {h._count.lessons ? `в ${h._count.lessons} темах` : "не привязано"}
            </span>
            <KeyCombo combo={h.keys} />
            <span className="flex items-center">
              <HotkeyForm hotkey={h} />
              <ActionButton action={deleteHotkey.bind(null, h.id)} confirm={`Удалить «${h.action}»?`} title="Удалить">
                <Trash2 className="size-3.5" />
              </ActionButton>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
