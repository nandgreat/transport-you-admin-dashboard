"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { apiErrorMessage } from "@/lib/axios";
import {
  useCreateVehicle,
  useVehicleTypes,
  useVehicleCategories,
} from "@/hooks/resources";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  registration_number: z.string().min(1, "Registration is required"),
  vehicle_type_id: z.string().min(1, "Vehicle type is required"),
  vehicle_category_id: z.string().optional(),
  capacity: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function VehicleFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateVehicle();
  const types = useVehicleTypes({ per_page: 100 });
  const categories = useVehicleCategories({ per_page: 100 });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const submit = (v: FormValues) => {
    create.mutate(
      {
        name: v.name,
        registration_number: v.registration_number,
        vehicle_type_id: Number(v.vehicle_type_id),
        vehicle_category_id: v.vehicle_category_id ? Number(v.vehicle_category_id) : undefined,
        capacity: v.capacity ? Number(v.capacity) : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Vehicle added");
          reset();
          onClose();
        },
        onError: (e) => toast.error(apiErrorMessage(e, "Could not add vehicle")),
      }
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add vehicle"
      description="Register a vehicle to your fleet."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(submit)} loading={create.isPending}>
            Add vehicle
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <Field label="Vehicle name / label" required error={errors.name?.message}>
          <Input placeholder="Coaster 01" {...register("name")} />
        </Field>
        <Field label="Registration number" required error={errors.registration_number?.message}>
          <Input placeholder="ABC-123-XY" {...register("registration_number")} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Vehicle type" required error={errors.vehicle_type_id?.message}>
            <Select {...register("vehicle_type_id")}>
              <option value="">Select…</option>
              {(types.data?.items ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.vehicle_name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Category" error={errors.vehicle_category_id?.message}>
            <Select {...register("vehicle_category_id")}>
              <option value="">Select…</option>
              {(categories.data?.items ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.vehicle_category_name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Capacity (seats)" error={errors.capacity?.message}>
          <Input type="number" min="1" placeholder="14" {...register("capacity")} />
        </Field>
      </form>
    </Modal>
  );
}
