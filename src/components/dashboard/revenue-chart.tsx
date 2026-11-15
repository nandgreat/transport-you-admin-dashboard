"use client";

import { useEffect, useRef, useState } from "react";
import type { RevenueSeriesPoint } from "@/types/api";

const H = 240;
const PAD = { l: 52, r: 16, t: 16, b: 26 };

function compactNaira(n: number): string {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}m`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return `₦${Math.round(n)}`;
}

function labelFor(period: string, group: "day" | "month" | "year"): string {
  if (group === "year") return period;
  const parts = period.split("-").map(Number);
  if (group === "month") {
    return new Date(parts[0], parts[1] - 1, 1).toLocaleDateString(undefined, { month: "short" });
  }
  return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

export function RevenueChart({
  data,
  group,
  loading,
}: {
  data: RevenueSeriesPoint[];
  group: "day" | "month" | "year";
  loading?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      const cw = entries[0].contentRect.width;
      if (cw) setW(Math.max(320, cw));
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  if (loading) {
    return <div ref={ref} className="h-[240px] w-full animate-pulse rounded-lg bg-slate-100" />;
  }

  const n = data.length;
  const innerW = w - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const yMax = Math.max(1, ...data.map((d) => d.revenue));

  const x = (i: number) => (n <= 1 ? PAD.l + innerW / 2 : PAD.l + (i / (n - 1)) * innerW);
  const y = (v: number) => PAD.t + innerH - (v / yMax) * innerH;

  const linePath = data
    .map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.revenue).toFixed(1)}`)
    .join(" ");
  const areaPath =
    n > 0
      ? `${linePath} L${x(n - 1).toFixed(1)},${(PAD.t + innerH).toFixed(1)} L${x(0).toFixed(1)},${(
          PAD.t + innerH
        ).toFixed(1)} Z`
      : "";

  const gridVals = [0, 0.25, 0.5, 0.75, 1].map((f) => f * yMax);
  const labelCount = Math.min(n, 6);
  const labelIdx =
    n <= 1
      ? [0]
      : Array.from({ length: labelCount }, (_, k) => Math.round((k * (n - 1)) / (labelCount - 1)));

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (n === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const i = n <= 1 ? 0 : Math.round(((px - PAD.l) / innerW) * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, i)));
  };

  const hasData = data.some((d) => d.revenue > 0);
  const tipX = hover != null ? Math.min(Math.max(x(hover), PAD.l + 46), w - PAD.r - 46) : 0;

  return (
    <div ref={ref} className="w-full">
      <svg
        width={w}
        height={H}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        className="text-brand-600"
      >
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridVals.map((v, i) => (
          <g key={i}>
            <line x1={PAD.l} x2={w - PAD.r} y1={y(v)} y2={y(v)} className="stroke-slate-200" strokeWidth="1" />
            <text x={PAD.l - 8} y={y(v) + 3} textAnchor="end" className="fill-slate-400 text-[10px]">
              {compactNaira(v)}
            </text>
          </g>
        ))}

        {n > 0 && <path d={areaPath} fill="url(#revFill)" />}
        {n > 0 && (
          <path
            d={linePath}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {labelIdx.map((i) => (
          <text
            key={i}
            x={x(i)}
            y={H - 6}
            textAnchor="middle"
            className="fill-slate-400 text-[10px]"
          >
            {labelFor(data[i].period, group)}
          </text>
        ))}

        {hover != null && data[hover] && (
          <g>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD.t}
              y2={PAD.t + innerH}
              className="stroke-slate-300"
              strokeDasharray="3 3"
            />
            <circle
              cx={x(hover)}
              cy={y(data[hover].revenue)}
              r="4"
              fill="currentColor"
              stroke="white"
              strokeWidth="2"
            />
            <g transform={`translate(${tipX}, ${PAD.t + 6})`}>
              <rect x="-46" y="-4" width="92" height="36" rx="6" className="fill-slate-900" />
              <text x="0" y="9" textAnchor="middle" className="fill-slate-300 text-[10px]">
                {labelFor(data[hover].period, group)}
              </text>
              <text x="0" y="23" textAnchor="middle" className="fill-white text-[11px] font-semibold">
                {compactNaira(data[hover].revenue)}
              </text>
            </g>
          </g>
        )}
      </svg>
      {!hasData && (
        <p className="-mt-6 text-center text-xs text-slate-400">No revenue in this period yet.</p>
      )}
    </div>
  );
}
