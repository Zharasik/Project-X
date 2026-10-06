export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(480px,560px)]">
      <aside className="relative hidden overflow-hidden border-r border-border bg-surface lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Logo />
        <div>
          <p className="max-w-md text-2xl font-semibold tracking-display text-fg">
            Пропустил занятие?
            <br />
            <span className="text-fg-3">Открой и продолжи с того же места.</span>
          </p>
          <ul className="mt-10 grid max-w-md grid-cols-2 gap-x-8 gap-y-5 text-sm">
            {[
              ["01", "Лекции", "как web-статьи"],
              ["02", "Практика", "пошагово, со сдачей работы"],
              ["03", "Тесты", "с разбором ошибок"],
              ["04", "Тренажёр", "горячих клавиш Ps и Ai"],
            ].map(([n, t, d]) => (
              <li key={n}>
                <span className="font-mono text-xs text-fg-3">{n}</span>
                <p className="mt-1 font-medium text-fg">{t}</p>
                <p className="text-fg-2">{d}</p>
              </li>
            ))}
          </ul>
        </div>
        <p className="font-mono text-xs text-fg-3">Web Design · Photoshop · Illustrator</p>
      </aside>
      <main className="flex flex-col px-4 py-10 sm:px-12">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2 text-base font-semibold tracking-display">
      <span className="inline-flex size-6 items-center justify-center rounded-md bg-fg font-mono text-[11px] text-bg">DL</span>
      Design Lab
    </div>
  );
}
