"use client";

import {
  ArrowRight,
  Bus,
  Armchair,
  Clock,
  MapPin,
  Building2,
  Repeat,
  CalendarClock,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { useSchedule } from "@/hooks/resources";
import { Spinner } from "@/components/ui/states";
import {
  formatCurrency,
  formatDate,
  formatTime,
  durationBetween,
  assetUrl,
  cityLabel,
} from "@/lib/utils";
import type { Schedule } from "@/types/api";

const DAY_ABBR: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};
function formatWeekDays(days?: string[] | null): string {
  if (!days || days.length === 0) return "—";
  return days.map((d) => DAY_ABBR[d.toLowerCase()] ?? d).join(", ");
}

// Recurring patterns carry a plain time string ("07:00" / "07:00:00").
function formatClock(value?: string | null): string {
  if (!value) return "—";
  const m = value.match(/^(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : value;
}

function Detail({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-medium text-slate-900">{value ?? "—"}</p>
    </div>
  );
}

function Leg({ schedule }: { schedule: Schedule }) {
  const origin = schedule.route?.origin ?? (schedule.origin_city ? { city: schedule.origin_city } : null);
  const destination =
    schedule.route?.destination ?? (schedule.destination_city ? { city: schedule.destination_city } : null);
  const o = cityLabel(origin);
  const d = cityLabel(destination);

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      {/* Timeline */}
      <div className="flex items-center gap-4">
        <div>
          <p className="text-xl font-extrabold text-slate-900">{formatTime(schedule.departure_time)}</p>
          <p className="text-sm font-medium text-slate-700">{o.primary}</p>
          {o.secondary && <p className="text-xs text-slate-400">{o.secondary}</p>}
          <p className="text-xs text-slate-400">{formatDate(schedule.departure_time)}</p>
        </div>
        <div className="flex flex-1 flex-col items-center text-slate-300">
          <span className="text-xs font-medium text-slate-400">
            {durationBetween(schedule.departure_time, schedule.arrival_time)}
          </span>
          <div className="my-1 flex w-full items-center">
            <span className="h-2 w-2 rounded-full bg-brand-500" />
            <span className="h-px flex-1 bg-slate-200" />
            <Bus className="h-4 w-4 text-slate-400" />
            <span className="h-px flex-1 bg-slate-200" />
            <span className="h-2 w-2 rounded-full bg-accent-500" />
          </div>
          {schedule.route?.distance != null && (
            <span className="text-[11px] text-slate-400">{schedule.route.distance} km</span>
          )}
        </div>
        <div className="text-right">
          <p className="text-xl font-extrabold text-slate-900">{formatTime(schedule.arrival_time)}</p>
          <p className="text-sm font-medium text-slate-700">{d.primary}</p>
          {d.secondary && <p className="text-xs text-slate-400">{d.secondary}</p>}
          <p className="text-xs text-slate-400">{formatDate(schedule.arrival_time)}</p>
        </div>
      </div>

      {/* Chips */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge tone="blue">
          <Bus className="h-3 w-3" /> {schedule.vehicle_type?.vehicle_name ?? "Vehicle"}
        </Badge>
        {schedule.available_seats != null && (
          <Badge tone="green">
            <Armchair className="h-3 w-3" /> {schedule.available_seats} seats
          </Badge>
        )}
        {schedule.route?.estimated_duration != null && (
          <Badge tone="gray">
            <Clock className="h-3 w-3" /> ~{schedule.route.estimated_duration} hrs
          </Badge>
        )}
        <Badge tone="gray">{formatCurrency(schedule.fare)}</Badge>
      </div>
    </div>
  );
}

export function ScheduleDetailsModal({
  schedule,
  onClose,
}: {
  schedule: Schedule | null;
  onClose: () => void;
}) {
  // Recurring rows are ScheduleGroup patterns — their id lives in a different
  // table, so don't re-fetch them via GET /schedules/{id}.
  const isRecurring = schedule?.type === "recurring" || !!schedule?.days_of_week?.length;
  const { data: fetched, isFetching } = useSchedule(
    isRecurring ? null : schedule?.id ?? null
  );
  const s = fetched ?? schedule;

  if (!schedule || !s) return null;

  const origin = s.route?.origin ?? (s.origin_city ? { city: s.origin_city } : null);
  const destination = s.route?.destination ?? (s.destination_city ? { city: s.destination_city } : null);
  const logo = assetUrl(s.operator?.logo_url);

  return (
    <Modal
      open={!!schedule}
      onClose={onClose}
      size="lg"
      title={`${cityLabel(origin).primary} → ${cityLabel(destination).primary}`}
      description={`Schedule #${s.id}`}
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge tone={isRecurring ? "purple" : "gray"}>
              {isRecurring ? "Recurring" : "One-off"}
            </Badge>
            {s.status ? <StatusBadge status={s.status} /> : null}
            {s.is_round_trip && (
              <Badge tone="blue">
                <Repeat className="h-3 w-3" /> Round trip
              </Badge>
            )}
            {isFetching && <Spinner className="h-4 w-4" />}
          </div>
          <span className="text-xl font-bold text-slate-900">{formatCurrency(s.fare)}</span>
        </div>

        {isRecurring ? (
          /* Recurring pattern summary */
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Detail label="Runs on" value={formatWeekDays(s.days_of_week)} />
              <Detail
                label="Time"
                value={`${formatClock(s.departure_time)} – ${formatClock(s.arrival_time)}`}
              />
              <Detail label="Start date" value={formatDate(s.start_date)} />
              <Detail label="End date" value={formatDate(s.schedule_end_date ?? s.end_date)} />
            </div>
          </div>
        ) : (
          <>
            {/* Outbound */}
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <CalendarClock className="h-3.5 w-3.5" /> {s.is_round_trip ? "Outbound" : "Trip"}
              </p>
              <Leg schedule={s} />
            </div>

            {/* Return */}
            {s.is_round_trip && s.return_trip && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <Repeat className="h-3.5 w-3.5" /> Return
                </p>
                <Leg schedule={s.return_trip} />
              </div>
            )}
          </>
        )}

        {/* Vehicle + operator */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <Bus className="h-3.5 w-3.5" /> Vehicle
            </p>
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
              {assetUrl(s.vehicle_type?.image_url) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={assetUrl(s.vehicle_type?.image_url)!}
                  alt=""
                  className="h-12 w-16 rounded-md border border-slate-200 object-cover"
                />
              ) : (
                <div className="flex h-12 w-16 items-center justify-center rounded-md bg-slate-100 text-slate-400">
                  <Bus className="h-5 w-5" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {s.vehicle_type?.vehicle_name ?? "—"}
                </p>
                {s.vehicle_type?.capacity != null && (
                  <p className="text-xs text-slate-400">{s.vehicle_type.capacity} seats</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <Building2 className="h-3.5 w-3.5" /> Operator
            </p>
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt="" className="h-10 w-10 rounded-md object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-400">
                  <Building2 className="h-4 w-4" />
                </div>
              )}
              <span className="text-sm font-medium text-slate-800">{s.operator?.name ?? "—"}</span>
            </div>
          </div>
        </div>

        {/* Seat arrangement + seat map */}
        {(s.seat_arrangement || s.seats?.length) && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <Armchair className="h-3.5 w-3.5" /> Seat arrangement
            </p>
            <div className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center gap-3">
                {assetUrl(s.seat_arrangement?.arrangement_image) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={assetUrl(s.seat_arrangement?.arrangement_image)!}
                    alt=""
                    className="h-14 w-20 rounded-md border border-slate-200 bg-white object-contain"
                  />
                ) : null}
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {s.seat_arrangement?.name ?? s.seat_arrangement_label ?? "—"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {s.capacity ?? s.seat_arrangement?.number_of_seats ?? "—"} seats
                    {s.seat_selection_enabled ? " · seat selection on" : ""}
                  </p>
                </div>
              </div>

              {s.seats && s.seats.length > 0 && (
                <>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {s.seats.map((seat) => (
                      <span
                        key={seat.number}
                        title={seat.available ? "Available" : "Taken"}
                        className={
                          "flex h-7 w-7 items-center justify-center rounded-md text-xs font-medium " +
                          (seat.available
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                            : "bg-slate-100 text-slate-400 line-through")
                        }
                      >
                        {seat.number}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <span className="h-3 w-3 rounded bg-emerald-100 ring-1 ring-inset ring-emerald-200" />
                      Available
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-3 w-3 rounded bg-slate-100" />
                      Taken
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Route meta */}
        {(s.route?.distance != null || s.route?.estimated_duration != null) && (
          <div className="flex flex-wrap gap-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-slate-400" />
              {s.route?.distance != null ? `${s.route.distance} km` : "—"}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-slate-400" />
              {s.route?.estimated_duration != null ? `~${s.route.estimated_duration} hrs` : "—"}
            </span>
          </div>
        )}
      </div>
    </Modal>
  );
}
