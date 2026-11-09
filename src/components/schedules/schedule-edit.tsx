"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { apiErrorMessage } from "@/lib/axios";
import {
  useUpdateSchedule,
  useUpdateScheduleGroup,
  useLocations,
  useVehicleTypes,
} from "@/hooks/resources";
import { cn } from "@/lib/utils";
import type { Location, Schedule } from "@/types/api";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

// One-off trips and recurring patterns use different status vocabularies.
const ONE_OFF_STATUSES = ["scheduled", "in_transit", "completed", "cancelled"] as const;
const RECURRING_STATUSES = ["active", "paused", "ended"] as const;

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Scheduled",
  in_transit: "In transit",
  completed: "Completed",
  cancelled: "Cancelled",
  active: "Active",
  paused: "Paused",
  ended: "Ended",
};

const schema = z
  .object({
    mode: z.enum(["one_off", "recurring"]),
    origin_id: z.string().min(1, "Origin is required"),
    destination_id: z.string().min(1, "Destination is required"),
    vehicle_type_id: z.string().min(1, "Vehicle type is required"),
    seat_arrangement_type_id: z.string().optional(),
    fare: z.string().min(1, "Fare is required"),
    status: z.string().optional(),
    // one-off
    departure_dt: z.string().optional(),
    arrival_dt: z.string().optional(),
    // recurring
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    days_of_week: z.array(z.string()).optional(),
    departure_clock: z.string().optional(),
    arrival_clock: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.origin_id && v.destination_id && v.origin_id === v.destination_id) {
      ctx.addIssue({ code: "custom", path: ["destination_id"], message: "Destination cannot be the same as origin" });
    }

    if (v.mode === "one_off") {
      if (!v.departure_dt)
        ctx.addIssue({ code: "custom", path: ["departure_dt"], message: "Required" });
      if (v.arrival_dt && v.departure_dt && v.arrival_dt <= v.departure_dt)
        ctx.addIssue({ code: "custom", path: ["arrival_dt"], message: "Arrival must be after departure" });
    } else {
      if (!v.start_date) ctx.addIssue({ code: "custom", path: ["start_date"], message: "Required" });
      if (!v.end_date) ctx.addIssue({ code: "custom", path: ["end_date"], message: "Required" });
      else if (v.start_date && v.end_date < v.start_date)
        ctx.addIssue({ code: "custom", path: ["end_date"], message: "End date must be on or after the start date" });
      if (!v.days_of_week?.length)
        ctx.addIssue({ code: "custom", path: ["days_of_week"], message: "Pick at least one day" });
      if (!v.departure_clock)
        ctx.addIssue({ code: "custom", path: ["departure_clock"], message: "Required" });
      if (!v.arrival_clock)
        ctx.addIssue({ code: "custom", path: ["arrival_clock"], message: "Required" });
    }
  });

type FormValues = z.infer<typeof schema>;

// API datetime → "YYYY-MM-DDTHH:mm" for <input type="datetime-local">, no tz shift.
function toInputDateTime(value?: string | null): string {
  if (!value) return "";
  const m = String(value).match(/(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  return m ? `${m[1]}T${m[2]}` : "";
}

// API time → "HH:mm" for <input type="time">.
function toClock(value?: string | null): string {
  if (!value) return "";
  const m = String(value).match(/(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : "";
}

function locationLabel(l: Location): string {
  const city = (l.city || "").trim();
  return city && city.toLowerCase() !== l.name.trim().toLowerCase() ? `${l.name} · ${city}` : l.name;
}

function isRecurringSchedule(s: Schedule): boolean {
  return s.type === "recurring" || !!s.days_of_week?.length;
}

export function ScheduleEditModal({
  schedule,
  onClose,
}: {
  schedule: Schedule | null;
  onClose: () => void;
}) {
  const updateOneOff = useUpdateSchedule();
  const updateGroup = useUpdateScheduleGroup();
  const vehicleTypes = useVehicleTypes({ per_page: 100 });
  const locations = useLocations({ per_page: 100 });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { mode: "one_off", days_of_week: [] },
  });

  const mode = watch("mode");
  const originId = watch("origin_id");
  const destinationId = watch("destination_id");
  const vehicleTypeId = watch("vehicle_type_id");
  const seatArrangementId = watch("seat_arrangement_type_id");
  const days = watch("days_of_week") ?? [];

  const typeOptions = vehicleTypes.data?.items ?? [];
  const selectedType = typeOptions.find((t) => String(t.id) === vehicleTypeId);
  const arrangements = selectedType?.seat_arrangement_types ?? [];
  const locationOptions = locations.data?.items ?? [];
  const statuses = mode === "recurring" ? RECURRING_STATUSES : ONE_OFF_STATUSES;

  // Prefill each time a schedule is opened for editing.
  useEffect(() => {
    if (!schedule) return;
    const recurring = isRecurringSchedule(schedule);
    reset({
      mode: recurring ? "recurring" : "one_off",
      origin_id: schedule.route?.origin?.id ? String(schedule.route.origin.id) : "",
      destination_id: schedule.route?.destination?.id ? String(schedule.route.destination.id) : "",
      vehicle_type_id: schedule.vehicle_type?.id ? String(schedule.vehicle_type.id) : "",
      seat_arrangement_type_id: schedule.seat_arrangement?.id ? String(schedule.seat_arrangement.id) : "",
      fare: schedule.fare != null ? String(schedule.fare) : "",
      status: schedule.status ?? (recurring ? "active" : "scheduled"),
      departure_dt: recurring ? "" : toInputDateTime(schedule.departure_time),
      arrival_dt: recurring ? "" : toInputDateTime(schedule.arrival_time),
      start_date: recurring ? schedule.start_date ?? "" : "",
      end_date: recurring ? schedule.schedule_end_date ?? schedule.end_date ?? "" : "",
      days_of_week: recurring ? schedule.days_of_week ?? [] : [],
      departure_clock: recurring ? toClock(schedule.departure_time) : "",
      arrival_clock: recurring ? toClock(schedule.arrival_time) : "",
    });
  }, [schedule, reset]);

  // Keep the seat arrangement valid for the chosen vehicle type.
  useEffect(() => {
    if (!vehicleTypeId) return;
    const t = typeOptions.find((x) => String(x.id) === vehicleTypeId);
    const arrs = t?.seat_arrangement_types ?? [];
    if (arrs.length === 0) return;
    const current = getValues("seat_arrangement_type_id");
    if (current && arrs.some((a) => String(a.id) === current)) return;
    const def = arrs.find((a) => a.pivot?.is_default) ?? arrs[0];
    setValue("seat_arrangement_type_id", def ? String(def.id) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleTypeId, typeOptions]);

  const toggleDay = (day: string) => {
    setValue(
      "days_of_week",
      days.includes(day) ? days.filter((d) => d !== day) : [...days, day],
      { shouldValidate: true }
    );
  };

  const busy = updateOneOff.isPending || updateGroup.isPending;

  const submit = (v: FormValues) => {
    if (!schedule) return;

    const common = {
      origin_id: Number(v.origin_id),
      destination_id: Number(v.destination_id),
      vehicle_type_id: Number(v.vehicle_type_id),
      ...(v.seat_arrangement_type_id
        ? { seat_arrangement_type_id: Number(v.seat_arrangement_type_id) }
        : {}),
      fare: Number(v.fare),
      status: v.status || undefined,
    };

    const handlers = {
      onSuccess: () => {
        toast.success("Schedule updated successfully");
        onClose();
      },
      onError: (e: unknown) => toast.error(apiErrorMessage(e, "Could not update schedule")),
    };

    if (v.mode === "recurring") {
      updateGroup.mutate(
        {
          id: schedule.id,
          body: {
            ...common,
            start_date: v.start_date,
            end_date: v.end_date,
            days_of_week: v.days_of_week,
            departure_time: v.departure_clock,
            arrival_time: v.arrival_clock,
          },
        },
        handlers
      );
    } else {
      updateOneOff.mutate(
        {
          id: schedule.id,
          body: {
            ...common,
            departure_time: v.departure_dt,
            arrival_time: v.arrival_dt || undefined,
          },
        },
        handlers
      );
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Modal
      open={!!schedule}
      onClose={onClose}
      title={mode === "recurring" ? "Edit recurring schedule" : "Edit schedule"}
      description="Update this trip's route, vehicle, timing, fare or status."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(submit)} loading={busy}>
            Save changes
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(submit)} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Origin" required error={errors.origin_id?.message}>
            <Select {...register("origin_id")} disabled={locations.isLoading}>
              <option value="">Select origin…</option>
              {locationOptions.map((l) => (
                <option key={l.id} value={l.id} disabled={String(l.id) === destinationId}>
                  {locationLabel(l)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Destination" required error={errors.destination_id?.message}>
            <Select {...register("destination_id")} disabled={locations.isLoading}>
              <option value="">Select destination…</option>
              {locationOptions.map((l) => (
                <option key={l.id} value={l.id} disabled={String(l.id) === originId}>
                  {locationLabel(l)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Vehicle type" required error={errors.vehicle_type_id?.message}>
            <Select {...register("vehicle_type_id")} disabled={vehicleTypes.isLoading}>
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
          <Field label="Status" error={errors.status?.message}>
            <Select {...register("status")}>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {mode === "one_off" ? (
          <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 p-4 sm:grid-cols-2">
            <Field label="Departure" required error={errors.departure_dt?.message}>
              <Input type="datetime-local" {...register("departure_dt")} />
            </Field>
            <Field label="Arrival" error={errors.arrival_dt?.message}>
              <Input type="datetime-local" {...register("arrival_dt")} />
            </Field>
          </div>
        ) : (
          <div className="space-y-4 rounded-lg border border-slate-200 p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Start date" required error={errors.start_date?.message}>
                <Input type="date" {...register("start_date")} />
              </Field>
              <Field label="End date" required error={errors.end_date?.message}>
                <Input type="date" min={watch("start_date") || today} {...register("end_date")} />
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
  );
}
