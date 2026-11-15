"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Plus, IdCard, Pencil, Trash2, Phone, Mail, Navigation } from "lucide-react";
import {
  useDrivers,
  useCreateDriver,
  useUpdateDriver,
  useDeleteDriver,
  useUploadImage,
} from "@/hooks/resources";
import { useQueryFlag } from "@/hooks/useQueryFlag";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { AvailabilityBadge, DRIVER_AVAILABILITY } from "@/components/drivers/availability";
import { DriverTripsModal } from "@/components/drivers/driver-trips";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, LoadingBlock, ErrorState } from "@/components/ui/states";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { ImageUpload } from "@/components/ui/image-upload";
import { toast } from "@/components/ui/toaster";
import { apiErrorMessage } from "@/lib/axios";
import { assetUrl } from "@/lib/utils";
import type { Driver, DriverPayload } from "@/types/api";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  gender: z.enum(["male", "female", "other"]).or(z.literal("")).optional(),
  phone: z.string().optional(),
  email: z
    .string()
    .email("Enter a valid email")
    .or(z.literal(""))
    .optional(),
  licence_number: z.string().optional(),
  id_number: z.string().optional(),
  guarantor_name: z.string().optional(),
  guarantor_phone: z.string().optional(),
  guarantor_home_address: z.string().optional(),
  guarantor_work_address: z.string().optional(),
  status: z.enum(["active", "inactive"]),
  availability: z.enum(["available", "on_trip", "unavailable"]),
});
type FormValues = z.infer<typeof schema>;

function DriverFormModal({
  open,
  onClose,
  driver,
}: {
  open: boolean;
  onClose: () => void;
  driver?: Driver | null;
}) {
  const isEdit = !!driver;
  const create = useCreateDriver();
  const update = useUpdateDriver();
  const upload = useUploadImage();
  const qc = useQueryClient();
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // Prefill on open (edit) or clear to sensible defaults (create).
  useEffect(() => {
    if (!open) return;
    setPhotoFile(null);
    reset({
      name: driver?.name ?? "",
      gender: driver?.gender ?? "",
      phone: driver?.phone ?? "",
      email: driver?.email ?? "",
      licence_number: driver?.licence_number ?? "",
      id_number: driver?.id_number ?? "",
      guarantor_name: driver?.guarantor_name ?? "",
      guarantor_phone: driver?.guarantor_phone ?? "",
      guarantor_home_address: driver?.guarantor_home_address ?? "",
      guarantor_work_address: driver?.guarantor_work_address ?? "",
      status: driver?.status ?? "active",
      availability: driver?.availability ?? "available",
    });
  }, [open, driver, reset]);

  const busy = create.isPending || update.isPending || upload.isPending;

  const submit = async (v: FormValues) => {
    const body: DriverPayload = {
      name: v.name.trim(),
      gender: v.gender || null,
      phone: v.phone?.trim() || null,
      email: v.email?.trim() || null,
      licence_number: v.licence_number?.trim() || null,
      id_number: v.id_number?.trim() || null,
      guarantor_name: v.guarantor_name?.trim() || null,
      guarantor_phone: v.guarantor_phone?.trim() || null,
      guarantor_home_address: v.guarantor_home_address?.trim() || null,
      guarantor_work_address: v.guarantor_work_address?.trim() || null,
      status: v.status,
      availability: v.availability,
    };

    try {
      let driverId: number;
      if (isEdit && driver) {
        await update.mutateAsync({ id: driver.id, body });
        driverId = driver.id;
      } else {
        const created = await create.mutateAsync(body);
        driverId = created.id;
      }

      // Upload the photo after the driver exists so it attaches to the record.
      if (photoFile) {
        await upload.mutateAsync({ file: photoFile, type: "drivers", modelId: driverId });
        qc.invalidateQueries({ queryKey: ["drivers"] });
      }

      toast.success(isEdit ? "Driver updated" : "Driver added");
      reset();
      setPhotoFile(null);
      onClose();
    } catch (e) {
      toast.error(apiErrorMessage(e, isEdit ? "Could not update driver" : "Could not add driver"));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit driver" : "Add driver"}
      description={
        isEdit ? undefined : "Register a driver so they can be assigned to trips."
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(submit)} loading={busy}>
            {isEdit ? "Save changes" : "Add driver"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <Field label="Photograph">
          <ImageUpload
            file={photoFile}
            onSelect={setPhotoFile}
            existingUrl={assetUrl(driver?.photo_url)}
            uploading={upload.isPending}
          />
        </Field>

        <Field label="Full name" required error={errors.name?.message}>
          <Input placeholder="Musa Peter" {...register("name")} />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Gender" error={errors.gender?.message}>
            <Select {...register("gender")}>
              <option value="">Select…</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          <Field label="Phone" error={errors.phone?.message}>
            <Input placeholder="09023847288" {...register("phone")} />
          </Field>
        </div>

        <Field label="Email" error={errors.email?.message}>
          <Input type="email" placeholder="musa@example.com" {...register("email")} />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Licence number"
            error={errors.licence_number?.message}
            hint="Must be unique within your fleet."
          >
            <Input placeholder="LIC-12345" {...register("licence_number")} />
          </Field>
          <Field
            label="ID number"
            error={errors.id_number?.message}
            hint="National ID / NIN. Unique within your fleet."
          >
            <Input placeholder="e.g. NIN 12345678901" {...register("id_number")} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Status"
            error={errors.status?.message}
            hint="Inactive drivers can't be assigned to trips."
          >
            <Select {...register("status")}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
          <Field
            label="Availability"
            error={errors.availability?.message}
            hint="Updated automatically as trips start and complete."
          >
            <Select {...register("availability")}>
              {DRIVER_AVAILABILITY.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <h3 className="text-sm font-semibold text-slate-900">Guarantor</h3>
          <p className="mb-3 text-xs text-slate-400">All guarantor details are optional.</p>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Guarantor name" error={errors.guarantor_name?.message}>
                <Input placeholder="Jane Doe" {...register("guarantor_name")} />
              </Field>
              <Field label="Guarantor phone" error={errors.guarantor_phone?.message}>
                <Input placeholder="08012345678" {...register("guarantor_phone")} />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Home address" error={errors.guarantor_home_address?.message}>
                <Textarea
                  rows={2}
                  placeholder="Guarantor's home address"
                  {...register("guarantor_home_address")}
                />
              </Field>
              <Field label="Work address" error={errors.guarantor_work_address?.message}>
                <Textarea
                  rows={2}
                  placeholder="Guarantor's work address"
                  {...register("guarantor_work_address")}
                />
              </Field>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default function DriversPage() {
  const openNewFlag = useQueryFlag("new");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [toDelete, setToDelete] = useState<Driver | null>(null);
  const [viewingTrips, setViewingTrips] = useState<Driver | null>(null);

  const { data, isLoading, isError, refetch } = useDrivers({ page, per_page: 15 });
  const del = useDeleteDriver();

  const openCreate = () => {
    setEditing(null);
    setShowForm(true);
  };
  const openEdit = (d: Driver) => {
    setEditing(d);
    setShowForm(true);
  };
  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  useEffect(() => {
    if (openNewFlag) openCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openNewFlag]);

  const items = data?.items ?? [];

  const confirmDelete = () => {
    if (!toDelete) return;
    del.mutate(toDelete.id, {
      onSuccess: () => {
        toast.success("Driver deleted");
        setToDelete(null);
      },
      onError: (e) => toast.error(apiErrorMessage(e, "Could not delete driver")),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Drivers"
        description="Manage the drivers in your fleet and their details."
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New driver
          </Button>
        }
      />

      <Card>
        {isLoading ? (
          <LoadingBlock />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={IdCard}
            title="No drivers yet"
            description="Add your first driver to start assigning them to trips."
            action={
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" /> New driver
              </Button>
            }
          />
        ) : (
          <>
            <Table className="min-w-[980px]">
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Contact</TH>
                  <TH>Licence / ID</TH>
                  <TH>Status</TH>
                  <TH>Availability</TH>
                  <TH>Trips done</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((d) => (
                  <TR key={d.id}>
                    <TD>
                      <div className="flex items-center gap-2.5">
                        {assetUrl(d.photo_url) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={assetUrl(d.photo_url)!}
                            alt=""
                            className="h-9 w-9 shrink-0 rounded-full border border-slate-200 object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                            <IdCard className="h-4 w-4" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-900">{d.name}</p>
                          {d.gender ? (
                            <p className="text-xs capitalize text-slate-400">{d.gender}</p>
                          ) : null}
                        </div>
                      </div>
                    </TD>
                    <TD>
                      <div className="space-y-0.5 text-sm">
                        {d.phone ? (
                          <p className="flex items-center gap-1.5 text-slate-700">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            {d.phone}
                          </p>
                        ) : null}
                        {d.email ? (
                          <p className="flex items-center gap-1.5 text-slate-500">
                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                            {d.email}
                          </p>
                        ) : null}
                        {d.guarantor_name ? (
                          <p className="text-xs text-slate-400">
                            Guarantor: {d.guarantor_name}
                            {d.guarantor_phone ? ` · ${d.guarantor_phone}` : ""}
                          </p>
                        ) : null}
                        {!d.phone && !d.email && !d.guarantor_name ? (
                          <span className="text-slate-400">—</span>
                        ) : null}
                      </div>
                    </TD>
                    <TD className="text-slate-600">
                      <p>{d.licence_number ?? <span className="text-slate-400">—</span>}</p>
                      {d.id_number ? (
                        <p className="text-xs text-slate-400">ID: {d.id_number}</p>
                      ) : null}
                    </TD>
                    <TD>
                      <StatusBadge status={d.status} />
                    </TD>
                    <TD>
                      <AvailabilityBadge value={d.availability} />
                    </TD>
                    <TD className="text-slate-600">{d.trips_completed ?? 0}</TD>
                    <TD className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingTrips(d)}
                        >
                          <Navigation className="h-4 w-4 text-slate-500" /> Trips
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(d)}
                          aria-label="Edit driver"
                        >
                          <Pencil className="h-4 w-4 text-slate-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setToDelete(d)}
                          aria-label="Delete driver"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination
              page={data?.meta?.current_page ?? page}
              lastPage={data?.meta?.last_page ?? 1}
              total={data?.meta?.total}
              onChange={setPage}
            />
          </>
        )}
      </Card>

      <DriverFormModal open={showForm} onClose={closeForm} driver={editing} />

      <DriverTripsModal driver={viewingTrips} onClose={() => setViewingTrips(null)} />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete driver"
        description={
          toDelete
            ? `Delete ${toDelete.name}? This cannot be undone.`
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
