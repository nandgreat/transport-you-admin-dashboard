"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Armchair, Image as ImageIcon } from "lucide-react";
import {
  useSeatArrangementTypes,
  useCreateSeatArrangementType,
  useUpdateSeatArrangementType,
  useDeleteSeatArrangementType,
  useUploadImage,
} from "@/hooks/resources";
import { useQueryFlag } from "@/hooks/useQueryFlag";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, LoadingBlock, ErrorState } from "@/components/ui/states";
import { ConfirmDialog } from "@/components/ui/confirm";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { ImageUpload } from "@/components/ui/image-upload";
import { toast } from "@/components/ui/toaster";
import { apiErrorMessage } from "@/lib/axios";
import { assetUrl } from "@/lib/utils";
import type { SeatArrangementType } from "@/types/api";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  number_of_seats: z.string().min(1, "Number of seats is required"),
  description: z.string().optional(),
  status: z.enum(["active", "inactive"]),
});
type FormValues = z.infer<typeof schema>;

function ArrangementFormModal({
  open,
  onClose,
  arrangement,
}: {
  open: boolean;
  onClose: () => void;
  arrangement?: SeatArrangementType | null;
}) {
  const isEdit = !!arrangement;
  const create = useCreateSeatArrangementType();
  const update = useUpdateSeatArrangementType();
  const upload = useUploadImage();

  const [file, setFile] = useState<File | null>(null);
  const [cleared, setCleared] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setCleared(false);
    reset({
      name: arrangement?.name ?? "",
      number_of_seats: arrangement?.number_of_seats ? String(arrangement.number_of_seats) : "",
      description: arrangement?.description ?? "",
      status: (arrangement?.status as "active" | "inactive") ?? "active",
    });
  }, [open, arrangement, reset]);

  const busy = create.isPending || update.isPending || upload.isPending;

  const onImageSelect = (f: File | null) => {
    setFile(f);
    if (f) setCleared(false);
    else if (arrangement?.arrangement_image) setCleared(true);
  };

  const submit = async (v: FormValues) => {
    try {
      // Upload the arrangement image first (stored under the generic "misc"
      // bucket since there's no dedicated model map for it) to get its path.
      let imagePath: string | null | undefined;
      if (file) {
        const res = await upload.mutateAsync({ file, type: "misc" });
        imagePath = res.path;
      } else if (cleared) {
        imagePath = null;
      }

      const body: Record<string, unknown> = {
        name: v.name,
        number_of_seats: Number(v.number_of_seats),
        description: v.description || undefined,
        status: v.status,
      };
      if (imagePath !== undefined) body.arrangement_image = imagePath;

      if (isEdit && arrangement) {
        await update.mutateAsync({ id: arrangement.id, body });
        toast.success("Seat arrangement updated");
      } else {
        await create.mutateAsync(body);
        toast.success("Seat arrangement created");
      }
      reset();
      setFile(null);
      setCleared(false);
      onClose();
    } catch (e) {
      toast.error(apiErrorMessage(e, isEdit ? "Could not update arrangement" : "Could not create arrangement"));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit seat arrangement" : "New seat arrangement"}
      description="Define a seating layout that vehicle types can use."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(submit)} loading={busy}>
            {isEdit ? "Save changes" : "Create arrangement"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <Field label="Layout image">
          <ImageUpload
            existingUrl={cleared ? null : assetUrl(arrangement?.arrangement_image)}
            file={file}
            onSelect={onImageSelect}
            uploading={upload.isPending}
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name" required error={errors.name?.message}>
            <Input placeholder="7 Seater Arrangement" {...register("name")} />
          </Field>
          <Field label="Number of seats" required error={errors.number_of_seats?.message}>
            <Input type="number" min="1" placeholder="7" {...register("number_of_seats")} />
          </Field>
        </div>
        <Field label="Status">
          <Select {...register("status")}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </Field>
        <Field label="Description">
          <Textarea placeholder="Short description of the seating layout" {...register("description")} />
        </Field>
      </form>
    </Modal>
  );
}

export default function SeatArrangementsPage() {
  const openNewFlag = useQueryFlag("new");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SeatArrangementType | null>(null);
  const [toDelete, setToDelete] = useState<SeatArrangementType | null>(null);

  const { data, isLoading, isError, refetch } = useSeatArrangementTypes({ page, per_page: 50 });
  const del = useDeleteSeatArrangementType();

  const openCreate = () => {
    setEditing(null);
    setShowForm(true);
  };
  const openEdit = (a: SeatArrangementType) => {
    setEditing(a);
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
        toast.success("Seat arrangement deleted");
        setToDelete(null);
      },
      onError: (e) => toast.error(apiErrorMessage(e, "Could not delete arrangement")),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Seat Arrangements"
        description="Manage the seating layouts available to your vehicle types."
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New arrangement
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
            icon={Armchair}
            title="No seat arrangements yet"
            description="Create a layout like ‘7 Seater Arrangement’ to assign to vehicle types."
            action={
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" /> New arrangement
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH className="w-16">Image</TH>
                  <TH>Name</TH>
                  <TH>Seats</TH>
                  <TH>Status</TH>
                  <TH>Vehicle types</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((a) => {
                  const img = assetUrl(a.arrangement_image);
                  return (
                    <TR key={a.id}>
                      <TD>
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={img}
                            alt={a.name}
                            className="h-10 w-14 rounded-md border border-slate-200 object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-14 items-center justify-center rounded-md border border-dashed border-slate-200 text-slate-300">
                            <ImageIcon className="h-4 w-4" />
                          </div>
                        )}
                      </TD>
                      <TD>
                        <p className="font-medium text-slate-900">{a.name}</p>
                        {a.description && (
                          <p className="max-w-xs truncate text-xs text-slate-400">{a.description}</p>
                        )}
                      </TD>
                      <TD className="text-slate-700">{a.number_of_seats}</TD>
                      <TD>
                        <Badge tone={a.status === "inactive" ? "gray" : "green"}>
                          {a.status ?? "active"}
                        </Badge>
                      </TD>
                      <TD className="text-slate-500">{a.vehicle_types_count ?? 0}</TD>
                      <TD className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(a)}
                            aria-label="Edit arrangement"
                          >
                            <Pencil className="h-4 w-4 text-slate-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setToDelete(a)}
                            aria-label="Delete arrangement"
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
            <Pagination
              page={data?.meta?.current_page ?? page}
              lastPage={data?.meta?.last_page ?? 1}
              total={data?.meta?.total}
              onChange={setPage}
            />
          </>
        )}
      </Card>

      <ArrangementFormModal open={showForm} onClose={closeForm} arrangement={editing} />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete seat arrangement"
        description={
          toDelete
            ? `Delete “${toDelete.name}”? ${
                toDelete.vehicle_types_count
                  ? `It is used by ${toDelete.vehicle_types_count} vehicle type(s).`
                  : "This cannot be undone."
              }`
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
