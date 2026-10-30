"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Bus, CalendarClock, Navigation } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { LoadingBlock, ErrorState, EmptyState } from "@/components/ui/states";
import { AvailabilityBadge } from "@/components/drivers/availability";
import { TripStatusBadge } from "@/components/scheduled-trips/status";
import { useDriverTrips } from "@/hooks/resources";
import { cityLabel, formatDate, formatTime, cn } from "@/lib/utils";
import type { Driver, DriverTrip, ScheduledTripStatus } from "@/types/api";

type Bucket = "assigned" | "ongoing" | "completed";

const TABS: { key: Bucket; label: string; status: ScheduledTripStatus }[] = [
  { key: "assigned", label: "Assigned", status: "not_started" },
  { key: "ongoing", label: "Ongoing", status: "ongoing" },
  { key: "completed", label: "Completed", status: "completed" },
];

export function DriverTripsModal({
  driver,
  onClose,
}: {
  driver: Driver | null;
  onClose: () => void;
}) {
  const { data, isLoading, isError, refetch } = useDriverTrips(driver?.id ?? null);
  const [tab, setTab] = useState<Bucket>("assigned");

  // Reset to the first tab each time a different driver opens.
  useEffect(() => setTab("assigned"), [driver?.id]);

  if (!driver) return null;

  const counts = data?.counts ?? { assigned: 0, ongoing: 0, completed: 0 };
  const activeStatus = TABS.find((t) => t.key === tab)!.status;
  const trips = (data?.trips ?? []).filter((t) => t.trip_status === activeStatus);

  return (
    <Modal
      open={!!driver}
      onClose={onClose}
      size="lg"
      title={driver.name}
      description={`${driver.trips_completed ?? 0} trip${
        (driver.trips_completed ?? 0) === 1 ? "" : "s"
      } completed`}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <AvailabilityBadge value={driver.availability} />
          {driver.licence_number && (
            <span className="text-xs text-slate-400">{driver.licence_number}</span>
          )}
        </div>

        {/* Bucket tabs */}
        <div className="flex gap-2 border-b border-slate-100">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition",
                tab === t.key
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              {t.label}
              <span
                className={cn(
                  "ml-1.5 rounded-full px-1.5 py-0.5 text-xs",
                  tab === t.key ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-500"
                )}
              >
                {counts[t.key]}
              </span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <LoadingBlock label="Loading trips…" />
        ) : isError ? (
          <ErrorState message="Couldn't load this driver's trips." onRetry={refetch} />
        ) : trips.length === 0 ? (
          <EmptyState
            icon={Navigation}
            title={`No ${tab} trips`}
            description={
              tab === "assigned"
                ? "This driver has no upcoming assigned trips."
                : tab === "ongoing"
                  ? "This driver isn't on a trip right now."
                  : "This driver hasn't completed any trips yet."
            }
          />
        ) : (
          <ul className="space-y-2">
            {trips.map((t) => (
              <TripRow key={t.id} trip={t} />
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

function TripRow({ trip }: { trip: DriverTrip }) {
  const origin = cityLabel(trip.route?.origin);
  const destination = cityLabel(trip.route?.destination);
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
          {origin.primary}
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          {destination.primary}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <CalendarClock className="h-3.5 w-3.5" />
            {formatDate(trip.travel_date ?? trip.departure_time)} · {formatTime(trip.departure_time)}
          </span>
          {trip.vehicle?.registration_number && (
            <span className="flex items-center gap-1">
              <Bus className="h-3.5 w-3.5" /> {trip.vehicle.registration_number}
            </span>
          )}
        </div>
      </div>
      <TripStatusBadge status={trip.trip_status} />
    </li>
  );
}
