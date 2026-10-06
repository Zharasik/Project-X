"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, House, Keyboard, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Главная", icon: House, match: (p: string) => p === "/" },
  { href: "/courses", label: "Курс", icon: BookOpen, match: (p: string) => p.startsWith("/courses") || p.startsWith("/lessons") || p.startsWith("/quiz") },
  { href: "/hotkeys", label: "Клавиши", icon: Keyboard, match: (p: string) => p.startsWith("/hotkeys") },
  { href: "/favorites", label: "Избранное", icon: Star, match: (p: string) => p.startsWith("/favorites") },
];

export function TopNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-0.5 md:flex">
      {ITEMS.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-2.5 py-1 text-sm transition-colors",
              active ? "bg-muted font-medium text-fg" : "text-fg-2 hover:text-fg",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="grid grid-cols-4">
        {ITEMS.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 text-[11px] transition-colors",
                active ? "text-fg" : "text-fg-3",
              )}
            >
              <Icon className="size-[18px]" strokeWidth={active ? 2.2 : 1.8} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
