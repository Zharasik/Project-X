import { cn } from "@/lib/utils";

/** "Практика 14 / 18" with a thin bar. */
export function StepMeter({ label, value, total, muted }: { label: string; value: number; total: number; muted?: boolean }) {
  const pct = total ? (value / total) * 100 : 0;
  return (
    <div className={cn(muted && "opacity-40")}>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-fg-2">{label}</span>
        <span className="font-mono text-fg tnum">
          {muted ? "—" : value}
          <span className="text-fg-3"> / {total}</span>
        </span>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted-2">
        <div className={cn("h-full rounded-full", pct === 100 ? "bg-success" : "bg-accent")} style={{ width: `${muted ? 0 : pct}%` }} />
      </div>
    </div>
  );
}
