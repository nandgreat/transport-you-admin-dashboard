"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, IdCard, Pencil, Trash2, Phone, Mail, Navigation } from "lucide-react";
import {
  useDrivers,
  useCreateDriver,
  useUpdateDriver,
  useDeleteDriver,
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
import { Input, Select, Field } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { apiErrorMessage } from "@/lib/axios";
import type { Driver, DriverPayload } from "@/types/api";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  email: z
    .string()
    .email("Enter a valid email")
    .or(z.literal(""))
    .optional(),
  licence_number: z.string().optional(),
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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // Prefill on open (edit) or clear to sensible defaults (create).
  useEffect(() => {
    if (!open) return;
    reset({
      name: driver?.name ?? "",
      phone: driver?.phone ?? "",
      email: driver?.email ?? "",
      licence_number: driver?.licence_number ?? "",
      status: driver?.status ?? "active",
      availability: driver?.availability ?? "available",
    });
  }, [open, driver, reset]);

  const busy = create.isPending || update.isPending;

  const submit = (v: FormValues) => {
    const body: DriverPayload = {
      name: v.name.trim(),
      phone: v.phone?.trim() || null,
      email: v.email?.trim() || null,
      licence_number: v.licence_number?.trim() || null,
      status: v.status,
      availability: v.availability,
    };

    if (isEdit && driver) {
      update.mutate(
        { id: driver.id, body },
        {
          onSuccess: () => {
            toast.success("Driver updated");
            onClose();
          },
          onError: (e) => toast.error(apiErrorMessage(e, "Could not update driver")),
        }
      );
    } else {
      create.mutate(body, {
        onSuccess: () => {
          toast.success("Driver added");
          reset();
          onClose();
        },
        onError: (e) => toast.error(apiErrorMessage(e, "Could not add driver")),
      });
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
        <Field label="Full name" required error={errors.name?.message}>
          <Input placeholder="Musa Peter" {...register("name")} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Phone" error={errors.phone?.message}>
            <Input placeholder="09023847288" {...register("phone")} />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <Input
              type="email"
              placeholder="musa@example.com"
              {...register("email")}
            />
          </Field>
        </div>
        <Field
          label="Licence number"
          error={errors.licence_number?.message}
          hint="Must be unique within your fleet."
        >
          <Input placeholder="LIC-12345" {...register("licence_number")} />
        </Field>
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
                  <TH>Licence</TH>
                  <TH>Status</TH>
                  <TH>Availability</TH>
                  <TH>Trips done</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((d) => (
                  <TR key={d.id}>
                    <TD className="font-medium text-slate-900">{d.name}</TD>
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
                        {!d.phone && !d.email ? (
                          <span className="text-slate-400">—</span>
                        ) : null}
                      </div>
                    </TD>
                    <TD className="text-slate-600">
                      {d.licence_number ?? <span className="text-slate-400">—</span>}
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
