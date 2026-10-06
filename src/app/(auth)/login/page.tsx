import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "./form";

export const metadata: Metadata = { title: "Вход" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
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
