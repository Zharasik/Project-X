import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getCurrentUser } from "@/lib/auth";
import { getAccessibleLesson } from "@/lib/progress";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES, submissionPrefix, uploadError } from "@/lib/uploads";

/**
 * Issues short-lived client tokens so the browser can upload practice files
 * straight to Vercel Blob. The file is attached to a submission only when the
 * student submits the form (see submitPractice).
 */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const user = await getCurrentUser();
        if (!user?.studentProfile) throw new Error("Требуется вход студента");
        if (!pathname.startsWith(submissionPrefix(user.id)) || pathname.includes("..")) throw new Error("Недопустимый путь");
        const err = uploadError({ name: pathname, size: 0 });
        if (err) throw new Error(err);
        const lesson = await getAccessibleLesson(user.studentProfile.groupId, clientPayload ?? "");
        if (!lesson?.practice?.allowUpload) throw new Error("Загрузка для этого задания недоступна");
        return {
          allowedContentTypes: ALLOWED_UPLOAD_TYPES,
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Ошибка загрузки" }, { status: 400 });
  }
}
