import Link from "next/link";
import type { Metadata } from "next";
import type { FavoriteKind } from "@prisma/client";
import { requireStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import { SoftwareMark } from "@/components/ui/badge";
import { EmptyState, KeyCombo, PageHeader, SectionTitle } from "@/components/ui/misc";
import { FavoriteButton } from "@/components/student/favorite-button";

export const metadata: Metadata = { title: "Избранное" };

const SECTIONS: { kind: FavoriteKind; title: string; suffix: string }[] = [
  { kind: "LESSON", title: "Темы", suffix: "" },
  { kind: "LECTURE", title: "Лекции", suffix: "/lecture" },
  { kind: "PRACTICE", title: "Задания", suffix: "/practice" },
];

export default async function FavoritesPage() {
  const user = await requireStudent();
  const groupId = user.studentProfile.groupId;
  const favorites = await db.favorite.findMany({
    where: {
      userId: user.id,
      OR: [
        { hotkey: { published: true } },
        {
          lesson: {
            published: true,
            module: { published: true, course: { published: true, groups: { some: { groupId } } } },
          },
        },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: {
      lesson: { select: { id: true, title: true, summary: true, module: { select: { title: true, software: true } }, practice: { select: { title: true } } } },
      hotkey: true,
    },
  });

  const hotkeys = favorites.filter((f) => f.kind === "HOTKEY" && f.hotkey);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Избранное" description="Материалы, к которым вы хотите вернуться." />
      {favorites.length === 0 ? (
        <EmptyState
          title="Здесь пока пусто"
          description="Нажмите ☆ рядом с темой, лекцией, заданием или горячей клавишей, чтобы сохранить её сюда."
        />
      ) : (
        <div className="space-y-10">
          {SECTIONS.map((section) => {
            const items = favorites.filter((f) => f.kind === section.kind && f.lesson);
            if (items.length === 0) return null;
            return (
              <section key={section.kind}>
                <SectionTitle>{section.title}</SectionTitle>
                <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
                  {items.map((f) => {
                    const l = f.lesson!;
                    return (
                      <li key={f.id} className="flex items-center gap-3 pr-3">
                        <Link href={`/lessons/${l.id}${section.suffix}`} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 transition-colors hover:text-accent">
                          <SoftwareMark software={l.module.software} />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">
                              {section.kind === "PRACTICE" && l.practice ? l.practice.title : l.title}
                            </span>
                            <span className="block truncate text-xs text-fg-3">
                              {l.module.title}
                              {section.kind === "PRACTICE" && ` · ${l.title}`}
                            </span>
                          </span>
                        </Link>
                        <FavoriteButton kind={section.kind} lessonId={l.id} active />
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
          {hotkeys.length > 0 && (
            <section>
              <SectionTitle
                action={
                  <Link href="/hotkeys" className="text-sm text-fg-2 hover:text-fg">
                    Тренажёр →
                  </Link>
                }
              >
                Горячие клавиши
              </SectionTitle>
              <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
                {hotkeys.map((f) => (
                  <li key={f.id} className="flex items-center gap-3 px-4 py-2.5">
                    <SoftwareMark software={f.hotkey!.software} />
                    <span className="min-w-0 flex-1 truncate text-sm">{f.hotkey!.action}</span>
                    <KeyCombo combo={f.hotkey!.keys} />
                    <FavoriteButton kind="HOTKEY" hotkeyId={f.hotkey!.id} active />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
