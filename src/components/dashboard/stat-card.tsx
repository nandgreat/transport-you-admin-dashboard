import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  tone?: "brand" | "green" | "amber" | "purple" | "blue" | "rose";
  loading?: boolean;
  hint?: string;
  /** When set, the whole card becomes a link to this route. */
  href?: string;
}

const tones = {
  brand: "bg-brand-50 text-brand-600",
  green: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  purple: "bg-purple-50 text-purple-600",
  blue: "bg-sky-50 text-sky-600",
  rose: "bg-rose-50 text-rose-600",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "brand",
  loading,
  hint,
  href,
}: StatCardProps) {
  const inner = (
    <>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          {loading ? (
            <div className="mt-2 h-8 w-20 animate-pulse rounded bg-slate-100" />
          ) : (
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          )}
          {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        </div>
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-lg", tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {href && (
        <ArrowUpRight className="absolute right-4 bottom-4 h-4 w-4 text-slate-300 opacity-0 transition group-hover:opacity-100" />
      )}
    </>
  );

  const base = "relative block rounded-xl border border-slate-200 bg-white p-5 shadow-sm";

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          base,
          "group transition hover:border-brand-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30"
        )}
      >
        {inner}
      </Link>
    );
  }

  return <div className={base}>{inner}</div>;
}
