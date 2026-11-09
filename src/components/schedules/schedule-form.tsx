"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { apiErrorMessage } from "@/lib/axios";
import { useCreateSchedule, useLocations, useVehicleTypes } from "@/hooks/resources";
import { LocationFormModal } from "@/components/locations/location-form";
import { cn, assetUrl } from "@/lib/utils";
import type { Location } from "@/types/api";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

// Today's date as a local YYYY-MM-DD string (matches <input type="date"> values).
function localToday(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

const schema = z
  .object({
    mode: z.enum(["one_off", "recurring"]),
    origin_id: z.string().min(1, "Origin is required"),
    destination_id: z.string().min(1, "Destination is required"),
    vehicle_type_id: z.string().min(1, "Vehicle type is required"),
    seat_arrangement_type_id: z.string().optional(),
    fare: z.string().min(1, "Fare is required"),
    // one-off
    departure_time: z.string().optional(),
    arrival_time: z.string().optional(),
    is_round_trip: z.boolean().optional(),
    return_departure_time: z.string().optional(),
    return_arrival_time: z.string().optional(),
    return_fare: z.string().optional(),
    // recurring
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    days_of_week: z.array(z.string()).optional(),
    departure_clock: z.string().optional(),
    arrival_clock: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.origin_id && v.destination_id && v.origin_id === v.destination_id) {
      ctx.addIssue({
        code: "custom",
        path: ["destination_id"],
        message: "Destination cannot be the same as origin",
      });
    }

    if (v.mode === "one_off") {
      if (!v.departure_time)
        ctx.addIssue({ code: "custom", path: ["departure_time"], message: "Required" });
      if (!v.arrival_time)
        ctx.addIssue({ code: "custom", path: ["arrival_time"], message: "Required" });
    } else {
      const today = localToday();
      if (!v.start_date)
        ctx.addIssue({ code: "custom", path: ["start_date"], message: "Required" });
      else if (v.start_date < today)
        ctx.addIssue({
          code: "custom",
          path: ["start_date"],
          message: "Start date cannot be in the past",
        });
      if (!v.end_date) ctx.addIssue({ code: "custom", path: ["end_date"], message: "Required" });
      else if (v.start_date && v.end_date < v.start_date)
        ctx.addIssue({
          code: "custom",
          path: ["end_date"],
          message: "End date must be on or after the start date",
        });
      if (!v.days_of_week?.length)
        ctx.addIssue({ code: "custom", path: ["days_of_week"], message: "Pick at least one day" });
      if (!v.departure_clock)
        ctx.addIssue({ code: "custom", path: ["departure_clock"], message: "Required" });
      if (!v.arrival_clock)
        ctx.addIssue({ code: "custom", path: ["arrival_clock"], message: "Required" });
    }
  });

type FormValues = z.infer<typeof schema>;

// Label a location by its name, appending the city when it differs.
function locationLabel(l: Location): string {
  const city = (l.city || "").trim();
  return city && city.toLowerCase() !== l.name.trim().toLowerCase()
    ? `${l.name} · ${city}`
    : l.name;
}

export function ScheduleFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateSchedule();
  const vehicleTypes = useVehicleTypes({ per_page: 100 });
  const locations = useLocations({ per_page: 100 });

  // Which endpoint a freshly created location should fill in.
  const [addLocationFor, setAddLocationFor] = useState<null | "origin_id" | "destination_id">(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { mode: "one_off", is_round_trip: false, days_of_week: [] },
  });

  const mode = watch("mode");
  const originId = watch("origin_id");
  const destinationId = watch("destination_id");
  const isRoundTrip = watch("is_round_trip");
  const days = watch("days_of_week") ?? [];
  const startDate = watch("start_date");
  const vehicleTypeId = watch("vehicle_type_id");
  const seatArrangementId = watch("seat_arrangement_type_id");
  const today = localToday();

  const typeOptions = vehicleTypes.data?.items ?? [];
  // Seat arrangements available on the selected vehicle type.
  const selectedType = typeOptions.find((t) => String(t.id) === vehicleTypeId);
  const arrangements = selectedType?.seat_arrangement_types ?? [];
  const selectedArrangement = arrangements.find((a) => String(a.id) === seatArrangementId);

  const locationOptions = locations.data?.items ?? [];

  // When the vehicle type changes, default the seat arrangement to its default.
  useEffect(() => {
    const t = typeOptions.find((x) => String(x.id) === vehicleTypeId);
    const arrs = t?.seat_arrangement_types ?? [];
    const def = arrs.find((a) => a.pivot?.is_default) ?? arrs[0];
    setValue("seat_arrangement_type_id", def ? String(def.id) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleTypeId]);

  const toggleDay = (day: string) => {
    setValue(
      "days_of_week",
      days.includes(day) ? days.filter((d) => d !== day) : [...days, day],
      { shouldValidate: true }
    );
  };

  const submit = (v: FormValues) => {
    const base = {
      origin_id: Number(v.origin_id),
      destination_id: Number(v.destination_id),
      vehicle_type_id: Number(v.vehicle_type_id),
      ...(v.seat_arrangement_type_id
        ? { seat_arrangement_type_id: Number(v.seat_arrangement_type_id) }
        : {}),
      fare: Number(v.fare),
    };

    const body =
      v.mode === "one_off"
        ? {
            ...base,
            departure_time: v.departure_time,
            arrival_time: v.arrival_time,
            is_round_trip: !!v.is_round_trip,
            ...(v.is_round_trip
              ? {
                  return_departure_time: v.return_departure_time || undefined,
                  return_arrival_time: v.return_arrival_time || undefined,
                  return_fare: v.return_fare ? Number(v.return_fare) : undefined,
                }
              : {}),
          }
        : {
            ...base,
            start_date: v.start_date,
            end_date: v.end_date,
            days_of_week: v.days_of_week,
            departure_time: v.departure_clock,
            arrival_time: v.arrival_clock,
          };

    create.mutate(body, {
      onSuccess: () => {
        toast.success("Schedule created successfully");
        reset({ mode: v.mode, is_round_trip: false, days_of_week: [] });
        onClose();
      },
      onError: (e) => toast.error(apiErrorMessage(e, "Could not create schedule")),
    });
  };

  const locationsEmpty = !locations.isLoading && locationOptions.length === 0;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Create schedule"
        description="Add a one-off trip or a recurring weekly schedule."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={onClose} disabled={create.isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit(submit)} loading={create.isPending}>
              Create schedule
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(submit)} className="space-y-5">
          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
            {(["one_off", "recurring"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setValue("mode", m, { shouldValidate: true })}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition",
                  mode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {m === "one_off" ? "One-off trip" : "Recurring"}
              </button>
            ))}
          </div>

          {locationsEmpty && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <span>You have no locations yet. Add a terminal to build a route.</span>
              <button
                type="button"
                onClick={() => setAddLocationFor("origin_id")}
                className="font-medium text-amber-900 underline"
              >
                Add location
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Origin"
              required
              error={errors.origin_id?.message}
              hint={
                locations.isLoading
                  ? "Loading locations…"
                  : locations.isError
                  ? "Failed to load locations"
                  : undefined
              }
            >
              <Select {...register("origin_id")} disabled={locations.isLoading}>
                <option value="">Select origin…</option>
                {locationOptions.map((l) => (
                  <option
                    key={l.id}
                    value={l.id}
                    disabled={String(l.id) === destinationId}
                  >
                    {locationLabel(l)}
                  </option>
                ))}
              </Select>
              <button
                type="button"
                onClick={() => setAddLocationFor("origin_id")}
                className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
              >
                <Plus className="h-3 w-3" /> New location
              </button>
            </Field>

            <Field
              label="Destination"
              required
              error={errors.destination_id?.message}
            >
              <Select {...register("destination_id")} disabled={locations.isLoading}>
                <option value="">Select destination…</option>
                {locationOptions.map((l) => (
                  <option key={l.id} value={l.id} disabled={String(l.id) === originId}>
                    {locationLabel(l)}
                  </option>
                ))}
              </Select>
              <button
                type="button"
                onClick={() => setAddLocationFor("destination_id")}
                className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
              >
                <Plus className="h-3 w-3" /> New location
              </button>
            </Field>

            <Field label="Vehicle type" required error={errors.vehicle_type_id?.message}>
              <Select {...register("vehicle_type_id")}>
                <option value="">Select type…</option>
                {typeOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.vehicle_name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Seat arrangement"
              error={errors.seat_arrangement_type_id?.message}
              hint={
                !vehicleTypeId
                  ? "Select a vehicle type first"
                  : arrangements.length === 0
                  ? "This vehicle type has no seat arrangements"
                  : undefined
              }
            >
              <Select
                {...register("seat_arrangement_type_id")}
                disabled={!vehicleTypeId || arrangements.length === 0}
              >
                <option value="">Select arrangement…</option>
                {arrangements.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.number_of_seats} seats)
                    {a.pivot?.is_default ? " · default" : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Fare (₦)" required error={errors.fare?.message}>
              <Input type="number" min="0" placeholder="8500" {...register("fare")} />
            </Field>
          </div>

          {selectedArrangement && (
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              {assetUrl(selectedArrangement.arrangement_image) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={assetUrl(selectedArrangement.arrangement_image)!}
                  alt={selectedArrangement.name}
                  className="h-14 w-20 shrink-0 rounded-md border border-slate-200 bg-white object-contain"
                />
              ) : null}
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">{selectedArrangement.name}</p>
                <p className="text-xs text-slate-500">
                  {selectedArrangement.number_of_seats} seats
                </p>
                {selectedArrangement.description && (
                  <p className="mt-0.5 text-xs text-slate-400">{selectedArrangement.description}</p>
                )}
              </div>
            </div>
          )}

          {mode === "one_off" ? (
            <div className="space-y-4 rounded-lg border border-slate-200 p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Departure" required error={errors.departure_time?.message}>
                  <Input type="datetime-local" {...register("departure_time")} />
                </Field>
                <Field label="Arrival" required error={errors.arrival_time?.message}>
                  <Input type="datetime-local" {...register("arrival_time")} />
                </Field>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300" {...register("is_round_trip")} />
                This is a round trip
              </label>

              {isRoundTrip && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="Return departure">
                    <Input type="datetime-local" {...register("return_departure_time")} />
                  </Field>
                  <Field label="Return arrival">
                    <Input type="datetime-local" {...register("return_arrival_time")} />
                  </Field>
                  <Field label="Return fare (₦)">
                    <Input type="number" min="0" placeholder="7500" {...register("return_fare")} />
                  </Field>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 rounded-lg border border-slate-200 p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Start date" required error={errors.start_date?.message}>
                  <Input type="date" min={today} {...register("start_date")} />
                </Field>
                <Field label="End date" required error={errors.end_date?.message}>
                  <Input type="date" min={startDate || today} {...register("end_date")} />
                </Field>
                <Field label="Departure time" required error={errors.departure_clock?.message}>
                  <Input type="time" {...register("departure_clock")} />
                </Field>
                <Field label="Arrival time" required error={errors.arrival_clock?.message}>
                  <Input type="time" {...register("arrival_clock")} />
                </Field>
              </div>
              <Field label="Days of week" required error={errors.days_of_week?.message as string}>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(d)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium capitalize transition",
                        days.includes(d)
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-slate-300 bg-white text-slate-600 hover:border-brand-400"
                      )}
                    >
                      {d.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          )}
        </form>
      </Modal>

      {/* Inline location creation, launched from the origin/destination fields. */}
      <LocationFormModal
        open={addLocationFor !== null}
        onClose={() => setAddLocationFor(null)}
        onCreated={(loc) => {
          if (addLocationFor) setValue(addLocationFor, String(loc.id), { shouldValidate: true });
        }}
      />
    </>
  );
}
