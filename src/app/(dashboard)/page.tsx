"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  Ticket,
  Bus,
  Clock,
  ArrowRight,
  Plus,
  Navigation,
  Wallet,
  Coins,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  useBookings,
  useBookingSummary,
  useRevenueSeries,
  useSchedules,
  useScheduledTrips,
  useVehicles,
} from "@/hooks/resources";
import { useAuthStore } from "@/store/auth";
import { StatCard } from "@/components/dashboard/stat-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, LoadingBlock } from "@/components/ui/states";
import { formatCurrency, cn } from "@/lib/utils";

const quickLinks = [
  { label: "New Schedule", href: "/schedules?new=1", icon: CalendarClock },
  { label: "New Booking", href: "/bookings?new=1", icon: Ticket },
  { label: "Add Vehicle", href: "/vehicles?new=1", icon: Bus },
];

type PeriodKey = "today" | "7d" | "30d" | "month" | "year" | "custom";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "month", label: "This month" },
  { key: "year", label: "This year" },
  { key: "custom", label: "Custom" },
];

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function computeRange(key: Exclude<PeriodKey, "custom">): { from: string; to: string } {
  const now = new Date();
  const to = ymd(now);
  if (key === "today") return { from: to, to };
  if (key === "7d") {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return { from: ymd(d), to };
  }
  if (key === "30d") {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return { from: ymd(d), to };
  }
  if (key === "month") return { from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), to };
  return { from: ymd(new Date(now.getFullYear(), 0, 1)), to };
}

export default function DashboardHome() {
  const user = useAuthStore((s) => s.user);
  const today = ymd(new Date());

  const [period, setPeriod] = useState<PeriodKey>("today");
  const [range, setRange] = useState<{ from: string; to: string }>(() => computeRange("today"));
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo] = useState(today);
  const [group, setGroup] = useState<"day" | "month" | "year">("day");

  const summary = useBookingSummary({ date_from: range.from, date_to: range.to });
  const series = useRevenueSeries(group);

  // Operational (all-time) + recent, independent of the period filter.
  const schedules = useSchedules({ per_page: 1 });
  const scheduledTrips = useScheduledTrips({ per_page: 1 });
  const vehicles = useVehicles({ per_page: 1 });
  const recentBookings = useBookings({ per_page: 5 });
  const recent = recentBookings.data?.items ?? [];

  const periodLabel = useMemo(() => {
    if (period === "custom") return `${range.from} → ${range.to}`;
    return PERIODS.find((p) => p.key === period)?.label ?? "";
  }, [period, range]);

  const choosePeriod = (key: PeriodKey) => {
    setPeriod(key);
    if (key !== "custom") setRange(computeRange(key));
  };

  const applyCustom = () => {
    const from = customFrom <= customTo ? customFrom : customTo;
    const to = customFrom <= customTo ? customTo : customFrom;
    setRange({ from, to });
  };

  const money = (v?: number | string) => formatCurrency(v ?? 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Good day{user ? `, ${user.first_name}` : ""} 👋
        </h1>
        <p className="text-sm text-slate-500">
          Here&apos;s how your operation is doing ·{" "}
          <span className="font-medium text-slate-600">{periodLabel}</span>
        </p>
      </div>

      {/* Period filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => choosePeriod(p.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition",
                period === p.key
                  ? "bg-brand-600 text-white"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {period === "custom" && (
          <div className="flex items-end gap-2">
            <Input
              type="date"
              value={customFrom}
              max={today}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="w-[9.5rem]"
            />
            <span className="pb-2 text-sm text-slate-400">to</span>
            <Input
              type="date"
              value={customTo}
              max={today}
              onChange={(e) => setCustomTo(e.target.value)}
              className="w-[9.5rem]"
            />
            <Button onClick={applyCustom}>Apply</Button>
          </div>
        )}
      </div>

      {/* KPIs for the selected period */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Revenue"
          value={money(summary.data?.confirmed_amount)}
          icon={Wallet}
          tone="green"
          loading={summary.isLoading}
          hint="Confirmed bookings"
          href="/bookings"
        />
        <StatCard
          label="Booking value"
          value={money(summary.data?.total_amount)}
          icon={Coins}
          tone="brand"
          loading={summary.isLoading}
          hint="Excludes cancelled & expired"
          href="/bookings"
        />
        <StatCard
          label="Total bookings"
          value={summary.data?.total_bookings ?? 0}
          icon={Ticket}
          tone="blue"
          loading={summary.isLoading}
          href="/bookings"
        />
        <StatCard
          label="Confirmed"
          value={summary.data?.confirmed_bookings ?? 0}
          icon={CheckCircle2}
          tone="green"
          loading={summary.isLoading}
          href="/bookings"
        />
        <StatCard
          label="Pending"
          value={summary.data?.pending_bookings ?? 0}
          icon={Clock}
          tone="amber"
          loading={summary.isLoading}
          hint="Awaiting confirmation"
          href="/bookings"
        />
        <StatCard
          label="Cancelled"
          value={summary.data?.cancelled_bookings ?? 0}
          icon={XCircle}
          tone="rose"
          loading={summary.isLoading}
          href="/bookings"
        />
      </div>

      {/* Revenue chart */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Revenue</CardTitle>
            <p className="mt-0.5 text-xs text-slate-400">
              Confirmed booking revenue{" "}
              {group === "day" ? "· last 30 days" : group === "month" ? "· last 12 months" : "· last 5 years"}
            </p>
          </div>
          <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
            {(["day", "month", "year"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGroup(g)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium capitalize transition",
                  group === g
                    ? "bg-brand-600 text-white"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                )}
              >
                {g}
              </button>
            ))}
          </div>
        </CardHeader>
        <div className="px-4 pb-4 pt-2">
          <RevenueChart data={series.data ?? []} group={group} loading={series.isLoading} />
        </div>
      </Card>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        {quickLinks.map((q) => (
          <Link key={q.href} href={q.href}>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4" />
              {q.label}
            </Button>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent bookings */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
            <Link
              href="/bookings"
              className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          {recentBookings.isLoading ? (
            <LoadingBlock />
          ) : recent.length === 0 ? (
            <EmptyState
              icon={Ticket}
              title="No bookings yet"
              description="Bookings will appear here once customers start reserving trips."
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Booking</TH>
                  <TH>Customer</TH>
                  <TH>Trip</TH>
                  <TH>Amount</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {recent.map((b) => (
                  <TR key={b.id}>
                    <TD className="font-medium text-slate-900">#{b.id}</TD>
                    <TD>{b.customer?.name ?? "—"}</TD>
                    <TD className="text-slate-500">
                      {b.schedule?.route?.origin?.city ?? b.schedule?.route?.origin?.name ?? "—"} →{" "}
                      {b.schedule?.route?.destination?.city ??
                        b.schedule?.route?.destination?.name ??
                        "—"}
                    </TD>
                    <TD>{formatCurrency(b.total_amount)}</TD>
                    <TD>
                      <StatusBadge status={b.status} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        {/* Operations (all-time) */}
        <div className="grid grid-cols-1 gap-4">
          <StatCard
            label="Schedules"
            value={schedules.data?.meta?.total ?? schedules.data?.items.length ?? 0}
            icon={CalendarClock}
            tone="brand"
            loading={schedules.isLoading}
            href="/schedules"
          />
          <StatCard
            label="Scheduled trips"
            value={scheduledTrips.data?.meta?.total ?? scheduledTrips.data?.items.length ?? 0}
            icon={Navigation}
            tone="blue"
            loading={scheduledTrips.isLoading}
            href="/scheduled-trips"
          />
          <StatCard
            label="Vehicles"
            value={vehicles.data?.meta?.total ?? vehicles.data?.items.length ?? 0}
            icon={Bus}
            tone="purple"
            loading={vehicles.isLoading}
            href="/vehicles"
          />
        </div>
      </div>
    </div>
  );
}
