"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, ChartColumn, Inbox, Keyboard, LayoutGrid, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/teacher", label: "Обзор", icon: LayoutGrid, exact: true },
  { href: "/teacher/plans", label: "План занятий", icon: CalendarDays },
  { href: "/teacher/courses", label: "Курсы", icon: BookOpen, also: ["/teacher/lessons"] },
  { href: "/teacher/groups", label: "Группы", icon: Users, also: ["/teacher/students"] },
  { href: "/teacher/submissions", label: "Проверка работ", icon: Inbox, badge: true },
  { href: "/teacher/results", label: "Результаты тестов", icon: ChartColumn },
  { href: "/teacher/hotkeys", label: "Горячие клавиши", icon: Keyboard },
];

function isActive(pathname: string, item: (typeof ITEMS)[number]) {
  if (item.exact) return pathname === item.href;
  return pathname.startsWith(item.href) || (item.also ?? []).some((p) => pathname.startsWith(p));
}

export function TeacherSidebarNav({ pending }: { pending: number }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-0.5">
      {ITEMS.map((item) => {
        const active = isActive(pathname, item);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors",
              active ? "bg-muted-2 font-medium text-fg" : "text-fg-2 hover:bg-muted hover:text-fg",
            )}
          >
            <Icon className="size-4 shrink-0" strokeWidth={1.8} />
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge && pending > 0 && (
              <span className="rounded-sm bg-accent px-1.5 font-mono text-[11px] leading-[18px] text-accent-fg tnum">{pending}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function TeacherMobileNav({ pending }: { pending: number }) {
  const pathname = usePathname();
  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
      {ITEMS.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm",
              active ? "bg-fg text-bg" : "text-fg-2 hover:bg-muted",
            )}
          >
            {item.label}
            {item.badge && pending > 0 && <span className="font-mono text-xs opacity-70">{pending}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
