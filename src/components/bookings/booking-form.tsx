"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { apiErrorMessage } from "@/lib/axios";
import { useCreateBooking, useSchedules } from "@/hooks/resources";

const schema = z.object({
  schedule_id: z.string().min(1, "Schedule is required"),
  customer_name: z.string().min(1, "Customer name is required"),
  customer_email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  customer_phone: z.string().optional(),
  seats: z.string().min(1, "Seats required"),
  status: z.enum(["pending", "confirmed", "cancelled"]),
});

type FormValues = z.infer<typeof schema>;

export function BookingFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateBooking();
  const schedules = useSchedules({ per_page: 100 });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: "pending", seats: "1" },
  });

  const submit = (v: FormValues) => {
    create.mutate(
      {
        schedule_id: Number(v.schedule_id),
        customer_name: v.customer_name,
        customer_email: v.customer_email || undefined,
        customer_phone: v.customer_phone || undefined,
        seats: Number(v.seats),
        status: v.status,
      },
      {
        onSuccess: () => {
          toast.success("Booking created");
          reset({ status: "pending", seats: "1" });
          onClose();
        },
        onError: (e) => toast.error(apiErrorMessage(e, "Could not create booking")),
      }
    );
  };

  const scheduleOptions = schedules.data?.items ?? [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create booking"
      description="Manually create a booking on behalf of a customer."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(submit)} loading={create.isPending}>
            Create booking
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <Field label="Schedule" required error={errors.schedule_id?.message}>
          <Select {...register("schedule_id")}>
            <option value="">Select a schedule…</option>
            {scheduleOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.origin_city} → {s.destination_city} · #{s.id}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Customer name" required error={errors.customer_name?.message}>
          <Input placeholder="Jane Doe" {...register("customer_name")} />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Customer email" error={errors.customer_email?.message}>
            <Input type="email" placeholder="jane@example.com" {...register("customer_email")} />
          </Field>
          <Field label="Customer phone" error={errors.customer_phone?.message}>
            <Input placeholder="+234…" {...register("customer_phone")} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Seats" required error={errors.seats?.message}>
            <Input type="number" min="1" {...register("seats")} />
          </Field>
          <Field label="Status" error={errors.status?.message}>
            <Select {...register("status")}>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </Field>
        </div>
      </form>
    </Modal>
  );
}
