import Link from "next/link";
import type { Metadata } from "next";
import { isSetupDone } from "@/lib/actions/setup";
import { LoginForm } from "./form";

export const metadata: Metadata = { title: "Вход" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const needsSetup = !(await isSetupDone());
  return (
    <>
      {needsSetup && (
        <Link href="/setup" className="mb-8 block rounded-lg border border-accent/25 bg-accent-soft px-4 py-3 text-sm text-fg hover:border-accent/50">
          Платформа ещё не настроена — <span className="font-medium text-accent">создать аккаунт преподавателя →</span>
        </Link>
      )}
      <h1 className="text-xl font-semibold tracking-display">Вход</h1>
      <p className="mt-1 text-fg-2">Войдите, чтобы продолжить обучение.</p>
      <LoginForm next={next} />
      <p className="mt-6 text-sm text-fg-2">
        Нет аккаунта?{" "}
        <Link href="/register" className="font-medium text-fg underline-offset-4 hover:underline">
          Регистрация по коду группы
        </Link>
      </p>
    </>
  );
}
