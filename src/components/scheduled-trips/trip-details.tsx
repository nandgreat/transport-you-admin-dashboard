"use client";

import { useEffect, useState } from "react";
import {
  Bus,
  Armchair,
  Building2,
  CalendarClock,
  Users,
  UserRoundCog,
  CheckCircle2,
  CircleDashed,
  Phone,
  Ticket,
  IdCard,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm";
import { Badge } from "@/components/ui/badge";
import { Select, Field } from "@/components/ui/input";
import { Spinner, ErrorState } from "@/components/ui/states";
import { TripStatusBadge, TRIP_STATUSES } from "./status";
import { AvailabilityBadge } from "@/components/drivers/availability";
import {
  useTripManifest,
  useUpdateTripStatus,
  useAssignTrip,
  useUnassignTrip,
  useVehicles,
  useDrivers,
} from "@/hooks/resources";
import { toast } from "@/components/ui/toaster";
import { apiErrorMessage } from "@/lib/axios";
import {
  cityLabel,
  formatCurrency,
  formatDate,
  formatTime,
  durationBetween,
} from "@/lib/utils";
import type { ScheduledTrip, ScheduledTripStatus, Vehicle } from "@/types/api";

function vehicleLabel(v: Vehicle): string {
  return v.registration_number || v.plate_number || v.name || `Vehicle #${v.id}`;
}

// Assign (or reassign / clear) the concrete vehicle and driver for a trip.
// Own hooks + local state, so it mounts only while the modal is open.
function AssignmentSection({
  trip,
  onUpdated,
}: {
  trip: ScheduledTrip;
  onUpdated: (t: ScheduledTrip) => void;
}) {
  const vehicles = useVehicles({ per_page: 100 });
  const drivers = useDrivers({ per_page: 100 });
  const assign = useAssignTrip();
  const unassign = useUnassignTrip();

  const current = trip.assignment;
  const currentVehicle = current?.vehicle?.id ? String(current.vehicle.id) : "";
  const currentDriver = current?.driver?.id ? String(current.driver.id) : "";

  const [vehicleId, setVehicleId] = useState(currentVehicle);
  const [driverId, setDriverId] = useState(currentDriver);

  // Re-sync the selects whenever the trip or its assignment changes.
  useEffect(() => {
    setVehicleId(currentVehicle);
    setDriverId(currentDriver);
  }, [trip.id, currentVehicle, currentDriver]);

  // The vehicle must match the trip's scheduled vehicle type; the driver must
  // be active — mirror the backend's validation so only valid options show.
  const typeId = trip.vehicle_type?.id;
  const vehicleOptions = (vehicles.data?.items ?? []).filter(
    (v) => !typeId || v.vehicle_type_id === typeId
  );
  const driverOptions = (drivers.data?.items ?? []).filter((d) => d.status === "active");

  const busy = assign.isPending || unassign.isPending;
  const dirty = vehicleId !== currentVehicle || driverId !== currentDriver;

  const doAssign = () => {
    assign.mutate(
      { id: trip.id, vehicle_id: Number(vehicleId), driver_id: Number(driverId) },
      {
        onSuccess: (r) => {
          onUpdated(r);
          toast.success("Vehicle & driver assigned");
        },
        onError: (e) => toast.error(apiErrorMessage(e, "Could not assign vehicle & driver")),
      }
    );
  };

  const doUnassign = () => {
    unassign.mutate(trip.id, {
      onSuccess: (r) => {
        onUpdated(r);
        toast.success("Assignment cleared");
      },
      onError: (e) => toast.error(apiErrorMessage(e, "Could not clear assignment")),
    });
  };

  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <UserRoundCog className="h-3.5 w-3.5" /> Vehicle &amp; driver
      </p>

      <div className="space-y-3 rounded-lg border border-slate-200 p-4">
        {current?.assigned && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="flex items-center gap-1.5 text-slate-700">
              <Bus className="h-4 w-4 text-slate-400" />
              {current.vehicle?.registration_number ?? `Vehicle #${current.vehicle?.id}`}
            </span>
            <span className="flex items-center gap-1.5 text-slate-700">
              <IdCard className="h-4 w-4 text-slate-400" />
              {current.driver?.name}
              {current.driver?.phone ? (
                <span className="text-slate-400">· {current.driver.phone}</span>
              ) : null}
            </span>
            {current.driver?.availability ? (
              <AvailabilityBadge value={current.driver.availability} />
            ) : null}
            <Badge tone="green">
              <CheckCircle2 className="h-3 w-3" /> Assigned
            </Badge>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Vehicle">
            <Select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              disabled={busy || vehicles.isLoading || vehicleOptions.length === 0}
            >
              <option value="">Select vehicle…</option>
              {vehicleOptions.map((v) => (
                <option key={v.id} value={v.id}>
                  {vehicleLabel(v)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Driver">
            <Select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              disabled={busy || drivers.isLoading || driverOptions.length === 0}
            >
              <option value="">Select driver…</option>
              {driverOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.licence_number ? ` · ${d.licence_number}` : ""}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {!vehicles.isLoading && vehicleOptions.length === 0 && (
          <p className="text-xs text-amber-600">
            No {trip.vehicle_type?.vehicle_name ?? "matching"} vehicles available. Add one
            under Vehicles.
          </p>
        )}
        {!drivers.isLoading && driverOptions.length === 0 && (
          <p className="text-xs text-amber-600">
            No active drivers yet. Add one under Drivers.
          </p>
        )}

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={doAssign}
            loading={assign.isPending}
            disabled={!vehicleId || !driverId || !dirty}
          >
            {current?.assigned ? "Update assignment" : "Assign"}
          </Button>
          {current?.assigned && (
            <Button
              size="sm"
              variant="outline"
              onClick={doUnassign}
              loading={unassign.isPending}
              disabled={assign.isPending}
            >
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-medium text-slate-900">{value ?? "—"}</p>
    </div>
  );
}

export function TripDetailsModal({
  trip: incoming,
  onClose,
}: {
  trip: ScheduledTrip | null;
  onClose: () => void;
}) {
  const manifest = useTripManifest(incoming?.id ?? null);
  const updateStatus = useUpdateTripStatus();
  const [confirmCancel, setConfirmCancel] = useState(false);
  // Hold the latest version of the trip so a status change reflects in the open
  // modal immediately (the list refetches, but this `trip` prop stays stale).
  const [updated, setUpdated] = useState<ScheduledTrip | null>(null);
  useEffect(() => setUpdated(null), [incoming?.id]);

  const trip = updated && incoming && updated.id === incoming.id ? updated : incoming;

  if (!trip) return null;

  const origin = cityLabel(trip.route?.origin);
  const destination = cityLabel(trip.route?.destination);
  const isFinal = trip.trip_status === "completed" || trip.trip_status === "cancelled";
  const assigned = !!trip.assignment?.assigned;

  const setStatus = (status: ScheduledTripStatus) => {
    updateStatus.mutate(
      { id: trip.id, status },
      {
        onSuccess: (result) => {
          setUpdated(result);
          toast.success(
            status === "cancelled" ? "Trip cancelled" : "Trip status updated"
          );
          setConfirmCancel(false);
        },
        onError: (e) => toast.error(apiErrorMessage(e, "Could not update trip status")),
      }
    );
  };

  // Forward lifecycle steps (not_started → ongoing → completed). Cancel is a
  // separate, destructive control handled below.
  const forward = TRIP_STATUSES.filter((s) => s.value !== "cancelled");

  return (
    <>
      <Modal
        open={!!trip}
        onClose={onClose}
        size="lg"
        title={`${origin.primary} → ${destination.primary}`}
        description={`Trip #${trip.id} · ${formatDate(trip.travel_date ?? trip.departure_time)}`}
      >
        <div className="space-y-5">
          {/* Status + fare */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TripStatusBadge status={trip.trip_status} />
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 capitalize">
                {trip.source === "recurring" ? "Recurring" : "One-off"}
              </span>
            </div>
            <span className="text-xl font-bold text-slate-900">
              {formatCurrency(trip.fare)}
            </span>
          </div>

          {/* Timeline */}
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xl font-extrabold text-slate-900">
                  {formatTime(trip.departure_time)}
                </p>
                <p className="text-sm font-medium text-slate-700">{origin.primary}</p>
                {origin.secondary && (
                  <p className="text-xs text-slate-400">{origin.secondary}</p>
                )}
              </div>
              <div className="flex flex-1 flex-col items-center text-slate-300">
                <span className="text-xs font-medium text-slate-400">
                  {durationBetween(trip.departure_time, trip.arrival_time)}
                </span>
                <div className="my-1 flex w-full items-center">
                  <span className="h-2 w-2 rounded-full bg-brand-500" />
                  <span className="h-px flex-1 bg-slate-200" />
                  <Bus className="h-4 w-4 text-slate-400" />
                  <span className="h-px flex-1 bg-slate-200" />
                  <span className="h-2 w-2 rounded-full bg-accent-500" />
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-extrabold text-slate-900">
                  {formatTime(trip.arrival_time)}
                </p>
                <p className="text-sm font-medium text-slate-700">{destination.primary}</p>
                {destination.secondary && (
                  <p className="text-xs text-slate-400">{destination.secondary}</p>
                )}
              </div>
            </div>
          </div>

          {/* Vehicle / operator / seats */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg bg-slate-50 px-4 py-3 text-sm sm:grid-cols-4">
            <Detail
              label="Vehicle"
              value={
                <span className="flex items-center gap-1.5">
                  <Bus className="h-3.5 w-3.5 text-slate-400" />
                  {trip.vehicle_type?.vehicle_name ?? "—"}
                </span>
              }
            />
            <Detail
              label="Operator"
              value={
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  {trip.operator?.name ?? "—"}
                </span>
              }
            />
            <Detail
              label="Seats"
              value={
                <span className="flex items-center gap-1.5">
                  <Armchair className="h-3.5 w-3.5 text-slate-400" />
                  {trip.available_seats ?? "—"}/{trip.capacity ?? "—"} free
                </span>
              }
            />
            <Detail
              label="Arrangement"
              value={trip.seat_arrangement?.name ?? "—"}
            />
          </div>

          {/* Trip status control */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <CalendarClock className="h-3.5 w-3.5" /> Trip status
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {forward.map((s) => {
                const active = trip.trip_status === s.value;
                // A trip can't start until a vehicle and driver are assigned.
                const blockedByAssignment = s.value === "ongoing" && !assigned;
                return (
                  <Button
                    key={s.value}
                    size="sm"
                    variant={active ? "primary" : "outline"}
                    disabled={active || isFinal || updateStatus.isPending || blockedByAssignment}
                    loading={updateStatus.isPending && updateStatus.variables?.status === s.value}
                    onClick={() => setStatus(s.value)}
                  >
                    {s.label}
                  </Button>
                );
              })}
              {trip.trip_status !== "cancelled" && (
                <Button
                  size="sm"
                  variant="danger"
                  disabled={updateStatus.isPending}
                  onClick={() => setConfirmCancel(true)}
                  className="ml-auto"
                >
                  Cancel trip
                </Button>
              )}
            </div>
            {isFinal ? (
              <p className="mt-2 text-xs text-slate-400">
                This trip is {trip.trip_status} and can no longer be advanced.
              </p>
            ) : !assigned ? (
              <p className="mt-2 text-xs text-amber-600">
                Assign a vehicle and driver below before starting this trip.
              </p>
            ) : null}
          </div>

          {/* Vehicle & driver assignment (not for cancelled trips) */}
          {trip.trip_status !== "cancelled" && (
            <AssignmentSection trip={trip} onUpdated={setUpdated} />
          )}

          {/* Passenger manifest */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <Users className="h-3.5 w-3.5" /> Passenger manifest
              </p>
              {manifest.data && (
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {manifest.data.checked_in_count} checked in
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <CircleDashed className="h-3.5 w-3.5" />
                    {manifest.data.not_checked_in_count} pending
                  </span>
                </div>
              )}
            </div>

            {manifest.isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : manifest.isError ? (
              <ErrorState
                message="Couldn't load the manifest."
                onRetry={manifest.refetch}
              />
            ) : !manifest.data?.passengers.length ? (
              <p className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
                No passengers booked for this trip yet.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {manifest.data.passengers.map((p, i) => (
                  <li
                    key={`${p.booking_id}-${p.seat_number ?? i}`}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <span
                      className={
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sm font-semibold " +
                        (p.seat_number
                          ? "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200"
                          : "bg-slate-100 text-slate-400")
                      }
                    >
                      {p.seat_number ?? "—"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">
                        {p.name || "Passenger"}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-400">
                        {p.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {p.phone}
                          </span>
                        )}
                        {p.booking_reference && (
                          <span className="flex items-center gap-1">
                            <Ticket className="h-3 w-3" /> {p.booking_reference}
                          </span>
                        )}
                      </div>
                    </div>
                    {p.checked_in ? (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Checked in
                      </span>
                    ) : (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                        <CircleDashed className="h-3.5 w-3.5" /> Not checked in
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel trip"
        description={`Cancel the ${origin.primary} → ${destination.primary} trip on ${formatDate(
          trip.travel_date ?? trip.departure_time
        )}? This also cancels its ${trip.passenger_count ?? 0} booking(s) and cannot be undone.`}
        confirmLabel="Cancel trip"
        cancelLabel="Keep trip"
        danger
        loading={updateStatus.isPending}
        onConfirm={() => setStatus("cancelled")}
        onCancel={() => setConfirmCancel(false)}
      />
    </>
  );
}
