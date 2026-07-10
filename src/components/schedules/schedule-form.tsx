"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { apiErrorMessage } from "@/lib/axios";
import { useCreateSchedule, useVehicleTypes } from "@/hooks/resources";
import { cn } from "@/lib/utils";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

const schema = z
  .object({
    mode: z.enum(["one_off", "recurring"]),
    origin_city: z.string().min(1, "Origin is required"),
    destination_city: z.string().min(1, "Destination is required"),
    vehicle_type_id: z.string().min(1, "Vehicle type is required"),
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
    if (v.mode === "one_off") {
      if (!v.departure_time)
        ctx.addIssue({ code: "custom", path: ["departure_time"], message: "Required" });
      if (!v.arrival_time)
        ctx.addIssue({ code: "custom", path: ["arrival_time"], message: "Required" });
    } else {
      if (!v.start_date)
        ctx.addIssue({ code: "custom", path: ["start_date"], message: "Required" });
      if (!v.end_date) ctx.addIssue({ code: "custom", path: ["end_date"], message: "Required" });
      if (!v.days_of_week?.length)
        ctx.addIssue({ code: "custom", path: ["days_of_week"], message: "Pick at least one day" });
      if (!v.departure_clock)
        ctx.addIssue({ code: "custom", path: ["departure_clock"], message: "Required" });
      if (!v.arrival_clock)
        ctx.addIssue({ code: "custom", path: ["arrival_clock"], message: "Required" });
    }
  });

type FormValues = z.infer<typeof schema>;

export function ScheduleFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateSchedule();
  const vehicleTypes = useVehicleTypes({ per_page: 100 });

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
  const isRoundTrip = watch("is_round_trip");
  const days = watch("days_of_week") ?? [];

  const toggleDay = (day: string) => {
    setValue(
      "days_of_week",
      days.includes(day) ? days.filter((d) => d !== day) : [...days, day],
      { shouldValidate: true }
    );
  };

  const submit = (v: FormValues) => {
    const base = {
      origin_city: v.origin_city,
      destination_city: v.destination_city,
      vehicle_type_id: Number(v.vehicle_type_id),
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

  const typeOptions = vehicleTypes.data?.items ?? [];

  return (
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Origin city" required error={errors.origin_city?.message}>
            <Input placeholder="Abuja" {...register("origin_city")} />
          </Field>
          <Field label="Destination city" required error={errors.destination_city?.message}>
            <Input placeholder="Lagos" {...register("destination_city")} />
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
          <Field label="Fare (₦)" required error={errors.fare?.message}>
            <Input type="number" min="0" placeholder="8500" {...register("fare")} />
          </Field>
        </div>

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
                <Input type="date" {...register("start_date")} />
              </Field>
              <Field label="End date" required error={errors.end_date?.message}>
                <Input type="date" {...register("end_date")} />
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
