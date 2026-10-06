import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 text-base font-semibold tracking-display text-fg">
      <span className="inline-flex size-6 items-center justify-center rounded-md bg-fg font-mono text-[11px] text-bg">DL</span>
      <span className="hidden sm:inline">Design Lab</span>
    </Link>
  );
}
