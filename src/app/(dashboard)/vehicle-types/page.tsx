"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Layers, Tag, Pencil, ImageIcon } from "lucide-react";
import {
  useVehicleTypes,
  useCreateVehicleType,
  useUpdateVehicleType,
  useVehicleCategories,
  useCreateVehicleCategory,
  useUploadImage,
} from "@/hooks/resources";
import { useQueryFlag } from "@/hooks/useQueryFlag";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingBlock } from "@/components/ui/states";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { ImageUpload } from "@/components/ui/image-upload";
import { toast } from "@/components/ui/toaster";
import { apiErrorMessage } from "@/lib/axios";
import { assetUrl } from "@/lib/utils";
import type { VehicleType } from "@/types/api";

// --- Vehicle type form -----------------------------------------------------
const typeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  vehicle_category_id: z.string().optional(),
  capacity: z.string().optional(),
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

  const [file, setFile] = useState<File | null>(null);
  // Tracks whether the user explicitly removed an existing image.
  const [cleared, setCleared] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TypeValues>({ resolver: zodResolver(typeSchema) });

  // Prefill when opening in edit mode (and reset local image state each open).
  useEffect(() => {
    if (!open) return;
    setFile(null);
    setCleared(false);
    reset({
      name: vehicleType?.vehicle_name ?? "",
      description: vehicleType?.description ?? "",
      vehicle_category_id: vehicleType?.vehicle_category_id
        ? String(vehicleType.vehicle_category_id)
        : "",
      capacity: vehicleType?.capacity ? String(vehicleType.capacity) : "",
    });
  }, [open, vehicleType, reset]);

  const busy = create.isPending || update.isPending || upload.isPending;

  const onImageSelect = (f: File | null) => {
    setFile(f);
    if (f) setCleared(false);
    else if (vehicleType?.image_url) setCleared(true);
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

      // 2. Create / update the vehicle type, attaching the image path.
      const body: Record<string, unknown> = {
        name: v.name,
        description: v.description || undefined,
        vehicle_category_id: v.vehicle_category_id ? Number(v.vehicle_category_id) : undefined,
        capacity: v.capacity ? Number(v.capacity) : undefined,
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
  const [editing, setEditing] = useState<VehicleType | null>(null);
  const [showCat, setShowCat] = useState(false);

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
                  <TH>Capacity</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {typeItems.map((t) => {
                  const img = assetUrl(t.image_url);
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
                      <TD>{t.capacity ?? "—"}</TD>
                      <TD className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(t)}
                          aria-label="Edit vehicle type"
                        >
                          <Pencil className="h-4 w-4 text-slate-500" />
                        </Button>
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
    </div>
  );
}
