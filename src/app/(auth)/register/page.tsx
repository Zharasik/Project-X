import Link from "next/link";
import type { Metadata } from "next";
import { RegisterForm } from "./form";

export const metadata: Metadata = { title: "Регистрация" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="text-xl font-semibold tracking-display">Регистрация</h1>
      <p className="mt-1 text-fg-2">Код группы выдаёт преподаватель.</p>
      <RegisterForm />
      <p className="mt-6 text-sm text-fg-2">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="font-medium text-fg underline-offset-4 hover:underline">
          Войти
        </Link>
      </p>
    </>
  );
}
