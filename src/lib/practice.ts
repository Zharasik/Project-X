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

export function formatBytes(n: number) {
  if (n < 1024) return `${n} Б`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} КБ`;
  return `${(n / 1024 / 1024).toFixed(1)} МБ`;
}
