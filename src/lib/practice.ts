import { z } from "zod";

export const practiceStepSchema = z.object({
  title: z.string(),
  body: z.string().default(""),
  imageUrl: z.string().optional(),
});
export type PracticeStep = z.infer<typeof practiceStepSchema>;

export function parseSteps(json: unknown): PracticeStep[] {
  const r = z.array(practiceStepSchema).safeParse(json);
  return r.success ? r.data : [];
}

export const SUBMISSION_STATUS = {
  SUBMITTED: { label: "На проверке", tone: "accent" },
  ACCEPTED: { label: "Принято", tone: "success" },
  NEEDS_REVISION: { label: "На доработку", tone: "warning" },
} as const;

export { formatBytes } from "@/lib/utils";
