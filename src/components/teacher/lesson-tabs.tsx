"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function LessonTabs({ lessonId, filled }: { lessonId: string; filled: Record<string, boolean> }) {
  const pathname = usePathname();
  const base = `/teacher/lessons/${lessonId}`;
  const tabs = [
    { href: base, label: "Обзор", key: "" },
    { href: `${base}/lecture`, label: "Лекция", key: "lecture" },
    { href: `${base}/practice`, label: "Практика", key: "practice" },
    { href: `${base}/quiz`, label: "Тест", key: "quiz" },
    { href: `${base}/hotkeys`, label: "Горячие клавиши", key: "hotkeys" },
  ];
  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "relative inline-flex h-10 shrink-0 items-center gap-1.5 px-3 text-sm transition-colors",
              active ? "font-medium text-fg" : "text-fg-2 hover:text-fg",
            )}
          >
            {t.label}
            {t.key && <span className={cn("size-1.5 rounded-full", filled[t.key] ? "bg-success" : "bg-border-strong")} />}
            {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-fg" />}
          </Link>
        );
      })}
    </nav>
  );
}
