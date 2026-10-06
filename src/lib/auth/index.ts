import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { SESSION_COOKIE, sessionCookieOptions, signSession, verifySession, homeForRole } from "./session";

export async function createSession(userId: string, role: Role) {
  const token = await signSession({ sub: userId, role });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Current user (deduplicated per request), or null. */
export const getCurrentUser = cache(async () => {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  return db.user.findUnique({
    where: { id: session.sub },
    include: {
      studentProfile: { include: { group: true } },
      teacherProfile: true,
    },
  });
});

export async function requireUser(roles?: Role[]) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect(homeForRole(user.role));
  return user;
}

export async function requireStudent() {
  const user = await requireUser(["STUDENT"]);
  if (!user.studentProfile) redirect("/login");
  return { ...user, studentProfile: user.studentProfile };
}

/** Teachers (and future admins) manage content. */
export async function requireTeacher() {
  const user = await requireUser(["TEACHER", "ADMIN"]);
  if (!user.teacherProfile) redirect("/login");
  return { ...user, teacherProfile: user.teacherProfile };
}
