import { logout } from "@/lib/actions/auth";

export function UserMenu({ name, subtitle }: { name: string; subtitle?: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md p-1 transition-colors hover:bg-muted [&::-webkit-details-marker]:hidden">
        <span className="inline-flex size-7 items-center justify-center rounded-full bg-muted-2 text-xs font-semibold text-fg-2">
          {initials}
        </span>
      </summary>
      <div className="absolute right-0 z-50 mt-1 w-56 rounded-lg border border-border bg-surface p-1 shadow">
        <div className="px-2.5 py-2">
          <p className="truncate text-sm font-medium text-fg">{name}</p>
          {subtitle && <p className="truncate text-xs text-fg-3">{subtitle}</p>}
        </div>
        <div className="my-1 h-px bg-border" />
        <form action={logout}>
          <button className="w-full rounded-md px-2.5 py-1.5 text-left text-sm text-fg-2 transition-colors hover:bg-muted hover:text-fg">
            Выйти
          </button>
        </form>
      </div>
    </details>
  );
}
