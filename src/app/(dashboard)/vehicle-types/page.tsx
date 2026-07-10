"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Layers, Tag } from "lucide-react";
import {
  useVehicleTypes,
  useCreateVehicleType,
  useVehicleCategories,
  useCreateVehicleCategory,
} from "@/hooks/resources";
import { useQueryFlag } from "@/hooks/useQueryFlag";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingBlock } from "@/components/ui/states";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { apiErrorMessage } from "@/lib/axios";

// --- Vehicle type form -----------------------------------------------------
const typeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  vehicle_category_id: z.string().optional(),
  capacity: z.string().optional(),
});
type TypeValues = z.infer<typeof typeSchema>;

function TypeFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateVehicleType();
  const categories = useVehicleCategories({ per_page: 100 });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TypeValues>({ resolver: zodResolver(typeSchema) });

  const submit = (v: TypeValues) =>
    create.mutate(
      {
        name: v.name,
        description: v.description || undefined,
        vehicle_category_id: v.vehicle_category_id ? Number(v.vehicle_category_id) : undefined,
        capacity: v.capacity ? Number(v.capacity) : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Vehicle type created");
          reset();
          onClose();
        },
        onError: (e) => toast.error(apiErrorMessage(e, "Could not create type")),
      }
    );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New vehicle type"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(submit)} loading={create.isPending}>
            Create type
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <Field label="Name" required error={errors.name?.message}>
          <Input placeholder="Luxury Bus" {...register("name")} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Category">
            <Select {...register("vehicle_category_id")}>
              <option value="">Select…</option>
              {(categories.data?.items ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.vehicle_category_name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Capacity">
            <Input type="number" min="1" placeholder="30" {...register("capacity")} />
          </Field>
        </div>
        <Field label="Description">
          <Textarea placeholder="Optional description" {...register("description")} />
        </Field>
      </form>
    </Modal>
  );
}

// --- Category form ----------------------------------------------------------
const catSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});
type CatValues = z.infer<typeof catSchema>;

function CategoryFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateVehicleCategory();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CatValues>({ resolver: zodResolver(catSchema) });

  const submit = (v: CatValues) =>
    create.mutate(
      { name: v.name, description: v.description || undefined },
      {
        onSuccess: () => {
          toast.success("Category created");
          reset();
          onClose();
        },
        onError: (e) => toast.error(apiErrorMessage(e, "Could not create category")),
      }
    );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New vehicle category"
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(submit)} loading={create.isPending}>
            Create category
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <Field label="Name" required error={errors.name?.message}>
          <Input placeholder="Bus" {...register("name")} />
        </Field>
        <Field label="Description">
          <Textarea placeholder="Optional description" {...register("description")} />
        </Field>
      </form>
    </Modal>
  );
}

export default function VehicleTypesPage() {
  const openNewFlag = useQueryFlag("new");
  const [showType, setShowType] = useState(false);
  const [showCat, setShowCat] = useState(false);

  const types = useVehicleTypes({ per_page: 100 });
  const categories = useVehicleCategories({ per_page: 100 });

  useEffect(() => {
    if (openNewFlag) setShowType(true);
  }, [openNewFlag]);

  const typeItems = types.data?.items ?? [];
  const catItems = categories.data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicle Configuration"
        description="Define the vehicle types and categories used across schedules and fleet."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Types */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Vehicle Types</CardTitle>
            <Button size="sm" onClick={() => setShowType(true)}>
              <Plus className="h-4 w-4" /> New type
            </Button>
          </CardHeader>
          {types.isLoading ? (
            <LoadingBlock />
          ) : typeItems.length === 0 ? (
            <EmptyState icon={Layers} title="No vehicle types" description="Create a type like ‘Luxury Bus’ or ‘Sienna’." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Category</TH>
                  <TH>Capacity</TH>
                  <TH>Description</TH>
                </TR>
              </THead>
              <TBody>
                {typeItems.map((t) => (
                  <TR key={t.id}>
                    <TD className="font-medium text-slate-900">{t.vehicle_name}</TD>
                    <TD>
                      {catItems.find((c) => c.id === t.vehicle_category_id)?.vehicle_category_name ?? "—"}
                    </TD>
                    <TD>{t.capacity ?? "—"}</TD>
                    <TD className="text-slate-500">{t.description ?? "—"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        {/* Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Categories</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowCat(true)}>
              <Plus className="h-4 w-4" /> New
            </Button>
          </CardHeader>
          {categories.isLoading ? (
            <LoadingBlock />
          ) : catItems.length === 0 ? (
            <EmptyState icon={Tag} title="No categories" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {catItems.map((c) => (
                <li key={c.id} className="px-5 py-3">
                  <p className="font-medium text-slate-900">{c.vehicle_category_name}</p>
                  {c.description && <p className="text-xs text-slate-400">{c.description}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <TypeFormModal open={showType} onClose={() => setShowType(false)} />
      <CategoryFormModal open={showCat} onClose={() => setShowCat(false)} />
    </div>
  );
}
