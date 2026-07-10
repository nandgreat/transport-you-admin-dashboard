import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/types/api";

type Tone = "gray" | "green" | "amber" | "red" | "blue" | "purple";

const tones: Record<Tone, string> = {
  gray: "bg-slate-100 text-slate-700 ring-slate-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  blue: "bg-brand-50 text-brand-700 ring-brand-200",
  purple: "bg-purple-50 text-purple-700 ring-purple-200",
};

export function Badge({
  tone = "gray",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset capitalize",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

const statusTone: Record<string, Tone> = {
  pending: "amber",
  confirmed: "green",
  cancelled: "red",
  scheduled: "blue",
  completed: "green",
  active: "green",
  inactive: "gray",
};

export function StatusBadge({ status }: { status: BookingStatus | string }) {
  const tone = statusTone[status] ?? "gray";
  return <Badge tone={tone}>{status}</Badge>;
}
