"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Layers, Tag, Pencil, Trash2, ImageIcon } from "lucide-react";
import {
  useVehicleTypes,
  useCreateVehicleType,
  useUpdateVehicleType,
  useDeleteVehicleType,
  useVehicleCategories,
  useCreateVehicleCategory,
  useSeatArrangementTypes,
  useUploadImage,
} from "@/hooks/resources";
import { useQueryFlag } from "@/hooks/useQueryFlag";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingBlock } from "@/components/ui/states";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { ImageUpload } from "@/components/ui/image-upload";
import { ConfirmDialog } from "@/components/ui/confirm";
import { toast } from "@/components/ui/toaster";
import { apiErrorMessage } from "@/lib/axios";
import { assetUrl, cn } from "@/lib/utils";
import type { VehicleType } from "@/types/api";

// --- Vehicle type form -----------------------------------------------------
const typeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  vehicle_category_id: z.string().min(1, "Category is required"),
  year: z.string().min(1, "Year is required"),
  status: z.enum(["active", "inactive"]),
});
type TypeValues = z.infer<typeof typeSchema>;

function TypeFormModal({
  open,
  onClose,
  vehicleType,
}: {
  open: boolean;
  onClose: () => void;
  vehicleType?: VehicleType | null;
}) {
  const isEdit = !!vehicleType;
  const create = useCreateVehicleType();
  const update = useUpdateVehicleType();
  const upload = useUploadImage();
  const categories = useVehicleCategories({ per_page: 100 });
  const seatArrangements = useSeatArrangementTypes({ per_page: 100 });

  const [file, setFile] = useState<File | null>(null);
  // Tracks whether the user explicitly removed an existing image.
  const [cleared, setCleared] = useState(false);
  // A vehicle type can offer several seat arrangements; one is the default.
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [defaultId, setDefaultId] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TypeValues>({ resolver: zodResolver(typeSchema) });

  const arrangements = seatArrangements.data?.items ?? [];

  // Prefill when opening in edit mode (and reset local state each open).
  useEffect(() => {
    if (!open) return;
    setFile(null);
    setCleared(false);
    const arrs = vehicleType?.seat_arrangement_types ?? [];
    setSelectedIds(arrs.map((a) => a.id));
    setDefaultId(arrs.find((a) => a.pivot?.is_default)?.id ?? arrs[0]?.id ?? null);
    reset({
      name: vehicleType?.vehicle_name ?? "",
      vehicle_category_id: vehicleType?.vehicle_category_id
        ? String(vehicleType.vehicle_category_id)
        : "",
      year: vehicleType?.year ? String(vehicleType.year) : "",
      status: (vehicleType?.status as "active" | "inactive") ?? "active",
    });
  }, [open, vehicleType, reset]);

  const busy = create.isPending || update.isPending || upload.isPending;

  const onImageSelect = (f: File | null) => {
    setFile(f);
    if (f) setCleared(false);
    else if (vehicleType?.image_url) setCleared(true);
  };

  // Toggle an arrangement, keeping the default valid (first selected wins).
  const toggleArrangement = (id: number) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id);
        setDefaultId((d) => (d === id ? next[0] ?? null : d));
        return next;
      }
      setDefaultId((d) => (d == null ? id : d));
      return [...prev, id];
    });
  };

  const submit = async (v: TypeValues) => {
    try {
      // 1. Upload the new image first (if one was picked) to get its path.
      let imageUrl: string | null | undefined;
      if (file) {
        const res = await upload.mutateAsync({ file, type: "vehicles" });
        imageUrl = res.path;
      } else if (cleared) {
        imageUrl = null;
      }

      // 2. Create / update the vehicle type with its seat arrangements.
      const body: Record<string, unknown> = {
        vehicle_name: v.name,
        vehicle_category_id: Number(v.vehicle_category_id),
        year: Number(v.year),
        status: v.status,
        seat_arrangement_type_ids: selectedIds,
        default_seat_arrangement_type_id:
          defaultId && selectedIds.includes(defaultId) ? defaultId : undefined,
      };
      if (imageUrl !== undefined) body.image_url = imageUrl;

      if (isEdit && vehicleType) {
        await update.mutateAsync({ id: vehicleType.id, body });
        toast.success("Vehicle type updated");
      } else {
        await create.mutateAsync(body);
        toast.success("Vehicle type created");
      }
      reset();
      setFile(null);
      setCleared(false);
      setSelectedIds([]);
      setDefaultId(null);
      onClose();
    } catch (e) {
      toast.error(apiErrorMessage(e, isEdit ? "Could not update type" : "Could not create type"));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit vehicle type" : "New vehicle type"}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(submit)} loading={busy}>
            {isEdit ? "Save changes" : "Create type"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <Field label="Image">
          <ImageUpload
            existingUrl={cleared ? null : assetUrl(vehicleType?.image_url)}
            file={file}
            onSelect={onImageSelect}
            uploading={upload.isPending}
          />
        </Field>
        <Field label="Name" required error={errors.name?.message}>
          <Input placeholder="Toyota Hiace" {...register("name")} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Category" required error={errors.vehicle_category_id?.message}>
            <Select {...register("vehicle_category_id")}>
              <option value="">Select…</option>
              {(categories.data?.items ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.vehicle_category_name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Year" required error={errors.year?.message}>
            <Input type="number" min="1900" placeholder="2021" {...register("year")} />
          </Field>
          <Field label="Status">
            <Select {...register("status")}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
        </div>

        <Field
          label="Seat arrangements"
          hint="Select the layouts this vehicle supports, then mark one as the default."
        >
          <div className="space-y-2">
            {arrangements.length === 0 && (
              <p className="text-sm text-slate-400">No seat arrangements available.</p>
            )}
            {arrangements.map((a) => {
              const checked = selectedIds.includes(a.id);
              const isDefault = defaultId === a.id;
              const img = assetUrl(a.arrangement_image);
              return (
                <div
                  key={a.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-2 transition",
                    checked ? "border-brand-300 bg-brand-50/40" : "border-slate-200"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleArrangement(a.id)}
                    className="h-4 w-4 shrink-0 rounded border-slate-300"
                    aria-label={`Select ${a.name}`}
                  />
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt={a.name}
                      className="h-12 w-16 shrink-0 rounded-md border border-slate-200 bg-white object-contain"
                    />
                  ) : (
                    <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-md border border-dashed border-slate-200 text-slate-300">
                      <ImageIcon className="h-4 w-4" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">{a.name}</p>
                    <p className="text-xs text-slate-400">{a.number_of_seats} seats</p>
                  </div>
                  {checked &&
                    (isDefault ? (
                      <Badge tone="blue">Default</Badge>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDefaultId(a.id)}
                        className="rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
                      >
                        Set default
                      </button>
                    ))}
                </div>
              );
            })}
          </div>
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
  const [editing, setEditing] = useState<VehicleType | null>(null);
  const [toDelete, setToDelete] = useState<VehicleType | null>(null);
  const [showCat, setShowCat] = useState(false);

  const del = useDeleteVehicleType();
  const types = useVehicleTypes({ per_page: 100 });
  const categories = useVehicleCategories({ per_page: 100 });

  const openCreate = () => {
    setEditing(null);
    setShowType(true);
  };
  const openEdit = (t: VehicleType) => {
    setEditing(t);
    setShowType(true);
  };
  const closeType = () => {
    setShowType(false);
    setEditing(null);
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    del.mutate(toDelete.id, {
      onSuccess: () => {
        toast.success("Vehicle type deleted");
        setToDelete(null);
      },
      onError: (e) => toast.error(apiErrorMessage(e, "Could not delete vehicle type")),
    });
  };

  useEffect(() => {
    if (openNewFlag) openCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            <Button size="sm" onClick={openCreate}>
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
                  <TH className="w-16">Image</TH>
                  <TH>Name</TH>
                  <TH>Category</TH>
                  <TH>Seat arrangement</TH>
                  <TH>Capacity</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {typeItems.map((t) => {
                  const img = assetUrl(t.image_url);
                  const arrs = t.seat_arrangement_types ?? [];
                  const defaultArr = arrs.find((a) => a.pivot?.is_default) ?? arrs[0] ?? null;
                  return (
                    <TR key={t.id}>
                      <TD>
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={img}
                            alt={t.vehicle_name}
                            className="h-10 w-14 rounded-md border border-slate-200 object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-14 items-center justify-center rounded-md border border-dashed border-slate-200 text-slate-300">
                            <ImageIcon className="h-4 w-4" />
                          </div>
                        )}
                      </TD>
                      <TD className="font-medium text-slate-900">{t.vehicle_name}</TD>
                      <TD>
                        {catItems.find((c) => c.id === t.vehicle_category_id)?.vehicle_category_name ??
                          t.category?.vehicle_category_name ??
                          "—"}
                      </TD>
                      <TD className="text-slate-600">
                        {defaultArr ? (
                          <span>
                            {defaultArr.name}
                            {arrs.length > 1 && (
                              <span className="text-slate-400"> +{arrs.length - 1}</span>
                            )}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TD>
                      <TD>{defaultArr?.number_of_seats ?? t.capacity ?? "—"}</TD>
                      <TD className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(t)}
                            aria-label="Edit vehicle type"
                          >
                            <Pencil className="h-4 w-4 text-slate-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setToDelete(t)}
                            aria-label="Delete vehicle type"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TD>
                    </TR>
                  );
                })}
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

      <TypeFormModal open={showType} onClose={closeType} vehicleType={editing} />
      <CategoryFormModal open={showCat} onClose={() => setShowCat(false)} />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete vehicle type"
        description={
          toDelete
            ? `Delete “${toDelete.vehicle_name}”? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        danger
        loading={del.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
