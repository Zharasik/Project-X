import { LinkButton } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center px-4 text-center">
      <p className="font-mono text-sm text-fg-3">404</p>
      <h1 className="mt-2 text-xl font-semibold tracking-display">Страница не найдена</h1>
      <p className="mt-1 text-fg-2">Возможно, материал скрыт или ещё не опубликован.</p>
      <LinkButton href="/" variant="primary" className="mt-6">
        На главную
      </LinkButton>
    </div>
  );
}
