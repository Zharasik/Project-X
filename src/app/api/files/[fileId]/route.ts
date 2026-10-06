import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";

/** Serves an uploaded file to its owner or to the teacher of the owner's group. */
export async function GET(_: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const file = await db.submissionFile.findUnique({
    where: { id: fileId },
    include: { submission: { select: { studentId: true, student: { select: { studentProfile: { select: { group: { select: { teacherId: true } } } } } } } } },
  });
  if (!file) return new NextResponse("Not found", { status: 404 });

  const isOwner = file.submission.studentId === user.id;
  const isTeacher =
    user.role === "ADMIN" ||
    (user.teacherProfile && file.submission.student.studentProfile?.group.teacherId === user.teacherProfile.id);
  if (!isOwner && !isTeacher) return new NextResponse("Forbidden", { status: 403 });

  const data = await storage.get(file.storageKey);
  if (!data) return new NextResponse("Not found", { status: 404 });

  const inline = file.mimeType.startsWith("image/") || file.mimeType === "application/pdf";
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": file.mimeType === "image/svg+xml" ? "application/octet-stream" : file.mimeType,
      "Content-Disposition": `${inline && file.mimeType !== "image/svg+xml" ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=0",
    },
  });
}
