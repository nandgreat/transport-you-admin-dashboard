"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, MapPin, Pencil } from "lucide-react";
import {
  useLocations,
  useCreateLocation,
  useUpdateLocation,
  useStates,
} from "@/hooks/resources";
import { useQueryFlag } from "@/hooks/useQueryFlag";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, LoadingBlock, ErrorState } from "@/components/ui/states";
import { Modal } from "@/components/ui/modal";
import { Input, Select, Field } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { apiErrorMessage } from "@/lib/axios";
import { stateName } from "@/lib/utils";
import type { Location } from "@/types/api";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  city: z.string().min(1, "City is required"),
  state_id: z.string().min(1, "State is required"),
  status: z.enum(["active", "inactive"]).optional(),
});
type FormValues = z.infer<typeof schema>;

function LocationFormModal({
  open,
  onClose,
  location,
}: {
  open: boolean;
  onClose: () => void;
  location?: Location | null;
}) {
  const isEdit = !!location;
  const create = useCreateLocation();
  const update = useUpdateLocation();
  const states = useStates();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // Prefill on open (edit) or clear (create).
  useEffect(() => {
    if (!open) return;
    reset({
      name: location?.name ?? "",
      city: location?.city ?? "",
      state_id: location?.state_id ? String(location.state_id) : "",
      status: undefined,
    });
  }, [open, location, reset]);

  const busy = create.isPending || update.isPending;

  const submit = (v: FormValues) => {
    if (isEdit && location) {
      // Update only sends the fields the API accepts.
      update.mutate(
        {
          id: location.id,
          body: {
            name: v.name,
            city: v.city,
            state_id: Number(v.state_id),
            ...(v.status ? { status: v.status } : {}),
          },
        },
        {
          onSuccess: () => {
            toast.success("Location updated");
            onClose();
          },
          onError: (e) => toast.error(apiErrorMessage(e, "Could not update location")),
        }
      );
    } else {
      create.mutate(
        {
          name: v.name,
          city: v.city,
          state_id: Number(v.state_id),
        },
        {
          onSuccess: () => {
            toast.success("Location added");
            reset();
            onClose();
          },
          onError: (e) => toast.error(apiErrorMessage(e, "Could not add location")),
        }
      );
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit location" : "Add location"}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(submit)} loading={busy}>
            {isEdit ? "Save changes" : "Add location"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <Field label="Location name" required error={errors.name?.message}>
          <Input placeholder="Jabi Motor Park" {...register("name")} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="City" required error={errors.city?.message}>
            <Input placeholder="Abuja" {...register("city")} />
          </Field>
          <Field label="State" required error={errors.state_id?.message}>
            <Select {...register("state_id")}>
              <option value="">Select…</option>
              {(states.data?.items ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {isEdit && (
          <Field label="Status" hint="Leave unchanged to keep the current status.">
            <Select {...register("status")}>
              <option value="">No change</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
        )}
      </form>
    </Modal>
  );
}

export default function LocationsPage() {
  const openNewFlag = useQueryFlag("new");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const { data, isLoading, isError, refetch } = useLocations({ page, per_page: 15 });

  const openCreate = () => {
    setEditing(null);
    setShowForm(true);
  };
  const openEdit = (l: Location) => {
    setEditing(l);
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Locations"
        description="Terminals, parks and pickup points across your network."
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New location
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
            icon={MapPin}
            title="No locations yet"
            description="Add terminals and pickup points to build routes."
            action={
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" /> New location
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>City</TH>
                  <TH>State</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((l) => (
                  <TR key={l.id}>
                    <TD className="font-medium text-slate-900">{l.name}</TD>
                    <TD>{l.city ?? "—"}</TD>
                    <TD>{stateName(l.state)}</TD>
                    <TD className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(l)}
                        aria-label="Edit location"
                      >
                        <Pencil className="h-4 w-4 text-slate-500" />
                      </Button>
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

      <LocationFormModal open={showForm} onClose={closeForm} location={editing} />
    </div>
  );
}
