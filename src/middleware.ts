import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession, homeForRole } from "@/lib/auth/session";

const PUBLIC = ["/login", "/register"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const isPublic = PUBLIC.some((p) => pathname.startsWith(p));

  if (!session) {
    if (isPublic) return NextResponse.next();
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  if (isPublic) return NextResponse.redirect(new URL(homeForRole(session.role), req.url));

  const isTeacherArea = pathname.startsWith("/teacher");
  if (isTeacherArea && session.role === "STUDENT") return NextResponse.redirect(new URL("/", req.url));
  if (!isTeacherArea && !pathname.startsWith("/api") && session.role !== "STUDENT") {
    return NextResponse.redirect(new URL("/teacher", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico)$).*)"],
};
