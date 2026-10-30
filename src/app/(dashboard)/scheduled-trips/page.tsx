"use client";

import { useState } from "react";
import { ArrowRight, Navigation, Eye, Users, Bus } from "lucide-react";
import { useScheduledTrips } from "@/hooks/resources";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, LoadingBlock, ErrorState } from "@/components/ui/states";
import { TripDetailsModal } from "@/components/scheduled-trips/trip-details";
import { TripStatusBadge, TRIP_STATUSES } from "@/components/scheduled-trips/status";
import { cityLabel, formatCurrency, formatDate, formatTime, cn } from "@/lib/utils";
import type { ScheduledTrip, ScheduledTripStatus } from "@/types/api";

type StatusFilter = "all" | ScheduledTripStatus;

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  ...TRIP_STATUSES.map((s) => ({ value: s.value, label: s.label })),
];

export default function ScheduledTripsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [viewing, setViewing] = useState<ScheduledTrip | null>(null);

  const { data, isLoading, isError, refetch } = useScheduledTrips({
    page,
    per_page: 15,
    ...(status !== "all" ? { trip_status: status } : {}),
  });

  const items = data?.items ?? [];
  const serialBase =
    ((data?.meta?.current_page ?? page) - 1) * (data?.meta?.per_page ?? 15);

  const onFilter = (value: StatusFilter) => {
    setStatus(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scheduled Trips"
        description="Track dated trips, update their status, and view passenger manifests."
      />

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => onFilter(f.value)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
              status === f.value
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card>
        {isLoading ? (
          <LoadingBlock />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Navigation}
            title="No scheduled trips"
            description={
              status === "all"
                ? "Trips appear here once schedules have upcoming departures."
                : `No ${status.replace(/_/g, " ")} trips right now.`
            }
          />
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="space-y-3 p-4 lg:hidden">
              {items.map((t, idx) => (
                <TripCard
                  key={`m-${t.id}`}
                  trip={t}
                  serial={serialBase + idx + 1}
                  onView={() => setViewing(t)}
                />
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden lg:block">
              <Table className="min-w-[960px]">
                <THead>
                  <TR>
                    <TH>S/No</TH>
                    <TH>Route</TH>
                    <TH>Vehicle</TH>
                    <TH>Travel Date</TH>
                    <TH>Departure</TH>
                    <TH>Seats</TH>
                    <TH>Passengers</TH>
                    <TH>Status</TH>
                    <TH className="text-right">Actions</TH>
                  </TR>
                </THead>
                <TBody>
                  {items.map((t, idx) => {
                    const origin = cityLabel(t.route?.origin);
                    const destination = cityLabel(t.route?.destination);
                    return (
                      <TR
                        key={t.id}
                        className="cursor-pointer"
                        onClick={() => setViewing(t)}
                      >
                        <TD className="text-slate-500">{serialBase + idx + 1}</TD>
                        <TD>
                          <div className="flex items-center gap-2 text-slate-900">
                            <span className="whitespace-nowrap font-medium">
                              {origin.primary}
                            </span>
                            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span className="whitespace-nowrap font-medium">
                              {destination.primary}
                            </span>
                          </div>
                          <Badge tone={t.source === "recurring" ? "purple" : "gray"} className="mt-1">
                            {t.source === "recurring" ? "Recurring" : "One-off"}
                          </Badge>
                        </TD>
                        <TD className="whitespace-nowrap text-slate-700">
                          {t.vehicle_type?.vehicle_name ?? "—"}
                        </TD>
                        <TD className="whitespace-nowrap text-slate-600">
                          {formatDate(t.travel_date ?? t.departure_time)}
                        </TD>
                        <TD className="whitespace-nowrap text-slate-600">
                          {formatTime(t.departure_time)}
                        </TD>
                        <TD className="whitespace-nowrap text-slate-600">
                          <span className="font-medium text-slate-900">
                            {t.available_seats ?? "—"}
                          </span>
                          <span className="text-slate-400">/{t.capacity ?? "—"} free</span>
                        </TD>
                        <TD className="whitespace-nowrap text-slate-600">
                          <span className="inline-flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-slate-400" />
                            {t.passenger_count ?? 0}
                            {(t.checked_in_count ?? 0) > 0 && (
                              <span className="text-xs text-emerald-600">
                                ({t.checked_in_count} in)
                              </span>
                            )}
                          </span>
                        </TD>
                        <TD>
                          <TripStatusBadge status={t.trip_status} />
                        </TD>
                        <TD onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end">
                            <Button variant="ghost" size="sm" onClick={() => setViewing(t)}>
                              <Eye className="h-4 w-4 text-slate-500" /> View
                            </Button>
                          </div>
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </div>

            <Pagination
              page={data?.meta?.current_page ?? page}
              lastPage={data?.meta?.last_page ?? 1}
              total={data?.meta?.total}
              onChange={setPage}
            />
          </>
        )}
      </Card>

      <TripDetailsModal trip={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}

// Mobile-friendly card for a single trip.
function TripCard({
  trip: t,
  serial,
  onView,
}: {
  trip: ScheduledTrip;
  serial: number;
  onView: () => void;
}) {
  const origin = cityLabel(t.route?.origin);
  const destination = cityLabel(t.route?.destination);
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-slate-400">#{serial}</p>
          <div className="mt-0.5 flex items-center gap-2 text-sm font-semibold text-slate-900">
            {origin.primary}
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            {destination.primary}
          </div>
        </div>
        <TripStatusBadge status={t.trip_status} />
      </div>

      <div className="mt-1.5 flex flex-wrap gap-1">
        <Badge tone={t.source === "recurring" ? "purple" : "gray"}>
          {t.source === "recurring" ? "Recurring" : "One-off"}
        </Badge>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <Meta
          label="Vehicle"
          value={
            <span className="flex items-center gap-1">
              <Bus className="h-3 w-3 text-slate-400" /> {t.vehicle_type?.vehicle_name ?? "—"}
            </span>
          }
        />
        <Meta
          label="Travel date"
          value={formatDate(t.travel_date ?? t.departure_time)}
        />
        <Meta label="Departure" value={formatTime(t.departure_time)} />
        <Meta label="Fare" value={formatCurrency(t.fare)} />
        <Meta
          label="Seats"
          value={`${t.available_seats ?? "—"}/${t.capacity ?? "—"} free`}
        />
        <Meta
          label="Passengers"
          value={`${t.passenger_count ?? 0}${
            (t.checked_in_count ?? 0) > 0 ? ` · ${t.checked_in_count} in` : ""
          }`}
        />
      </dl>

      <div className="mt-3 border-t border-slate-100 pt-3">
        <Button variant="outline" size="sm" onClick={onView} className="w-full">
          <Eye className="h-4 w-4" /> View manifest
        </Button>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-700">{value}</dd>
    </div>
  );
}
