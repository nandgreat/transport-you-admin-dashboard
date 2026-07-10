"use client";

import Link from "next/link";
import { CalendarClock, Ticket, Bus, Clock, ArrowRight, Plus } from "lucide-react";
import { useBookings, useSchedules, useVehicles } from "@/hooks/resources";
import { useAuthStore, displayName } from "@/store/auth";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingBlock } from "@/components/ui/states";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const quickLinks = [
  { label: "New Schedule", href: "/schedules?new=1", icon: CalendarClock },
  { label: "New Booking", href: "/bookings?new=1", icon: Ticket },
  { label: "Add Vehicle", href: "/vehicles?new=1", icon: Bus },
];

export default function DashboardHome() {
  const user = useAuthStore((s) => s.user);

  const schedules = useSchedules({ per_page: 1 });
  const allBookings = useBookings({ per_page: 5 });
  const pending = useBookings({ status: "pending", per_page: 1 });
  const confirmed = useBookings({ status: "confirmed", per_page: 1 });
  const vehicles = useVehicles({ per_page: 1 });

  const recent = allBookings.data?.items ?? [];

  const revenue = recent.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Welcome back{user ? `, ${user.first_name}` : ""} 👋
        </h1>
        <p className="text-sm text-slate-500">
          Here&apos;s what&apos;s happening across your transport operation today.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Schedules"
          value={schedules.data?.meta?.total ?? schedules.data?.items.length ?? 0}
          icon={CalendarClock}
          tone="brand"
          loading={schedules.isLoading}
        />
        <StatCard
          label="Total Bookings"
          value={allBookings.data?.meta?.total ?? recent.length}
          icon={Ticket}
          tone="green"
          loading={allBookings.isLoading}
        />
        <StatCard
          label="Pending Bookings"
          value={pending.data?.meta?.total ?? 0}
          icon={Clock}
          tone="amber"
          loading={pending.isLoading}
          hint="Awaiting confirmation"
        />
        <StatCard
          label="Active Vehicles"
          value={vehicles.data?.meta?.total ?? vehicles.data?.items.length ?? 0}
          icon={Bus}
          tone="purple"
          loading={vehicles.isLoading}
        />
      </div>

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
          {allBookings.isLoading ? (
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
                  <TH>Reference</TH>
                  <TH>Customer</TH>
                  <TH>Amount</TH>
                  <TH>Status</TH>
                  <TH>Date</TH>
                </TR>
              </THead>
              <TBody>
                {recent.map((b) => (
                  <TR key={b.id}>
                    <TD className="font-medium text-slate-900">
                      {b.reference ?? `#${b.id}`}
                    </TD>
                    <TD>{b.customer_name ?? "—"}</TD>
                    <TD>{formatCurrency(b.amount)}</TD>
                    <TD>
                      <StatusBadge status={b.status} />
                    </TD>
                    <TD className="text-slate-500">{formatDateTime(b.created_at)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        {/* Snapshot */}
        <Card>
          <CardHeader>
            <CardTitle>Snapshot</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <SnapshotRow label="Confirmed bookings" value={confirmed.data?.meta?.total ?? 0} />
            <SnapshotRow label="Pending bookings" value={pending.data?.meta?.total ?? 0} />
            <SnapshotRow
              label="Recent revenue"
              value={formatCurrency(revenue)}
              hint="Last 5 bookings"
            />
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-700">Signed in as</p>
              <p className="mt-1 text-sm text-slate-500">{displayName(user)}</p>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function SnapshotRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-slate-600">{label}</p>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
      <p className="text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
