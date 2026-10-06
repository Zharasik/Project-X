import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { isSetupDone } from "@/lib/actions/setup";
import { SetupForm } from "./form";

export const metadata: Metadata = { title: "Первый запуск" };
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (await isSetupDone()) redirect("/login");
  return (
    <>
      <p className="font-mono text-xs text-fg-3">Первый запуск</p>
      <h1 className="mt-2 text-xl font-semibold tracking-display">Создайте аккаунт преподавателя</h1>
      <p className="mt-1 text-fg-2">Эта страница доступна, пока на платформе нет ни одного преподавателя.</p>
      <SetupForm />
    </>
  );
}
