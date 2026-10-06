"use client";

import { useActionState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { reviewSubmission, type ActionState } from "@/lib/actions/teacher";
import { Button } from "@/components/ui/button";
import { FormError, Textarea } from "@/components/ui/form";

/** After a decision the queue moves on to the next work; the page shows what was just reviewed. */
export function ReviewForm({ submissionId, feedback }: { submissionId: string; feedback: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, action, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = await reviewSubmission(submissionId, prev, fd);
    if (r?.ok) {
      const params = new URLSearchParams(searchParams);
      params.delete("id");
      params.set("reviewed", submissionId);
      router.replace(`/teacher/submissions?${params}`);
    }
    return r;
  }, undefined);
  return (
    <form action={action} className="space-y-3">
      <Textarea name="feedback" rows={3} defaultValue={feedback} placeholder="Комментарий студенту (обязателен при возврате на доработку)" />
      <FormError message={state?.error} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button name="status" value="NEEDS_REVISION" variant="secondary" disabled={pending}>
          На доработку
        </Button>
        <Button name="status" value="ACCEPTED" variant="primary" disabled={pending}>
          Принять
        </Button>
      </div>
    </form>
  );
}
