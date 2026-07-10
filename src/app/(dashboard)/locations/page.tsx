"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, MapPin } from "lucide-react";
import { useLocations, useCreateLocation, useStates } from "@/hooks/resources";
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

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  city: z.string().optional(),
  state_id: z.string().optional(),
  address: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function LocationFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateLocation();
  const states = useStates();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const submit = (v: FormValues) =>
    create.mutate(
      {
        name: v.name,
        city: v.city || undefined,
        state_id: v.state_id ? Number(v.state_id) : undefined,
        address: v.address || undefined,
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add location"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(submit)} loading={create.isPending}>
            Add location
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <Field label="Location name" required error={errors.name?.message}>
          <Input placeholder="Jabi Motor Park" {...register("name")} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="City">
            <Input placeholder="Abuja" {...register("city")} />
          </Field>
          <Field label="State">
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
        <Field label="Address">
          <Input placeholder="Street address" {...register("address")} />
        </Field>
      </form>
    </Modal>
  );
}

export default function LocationsPage() {
  const openNewFlag = useQueryFlag("new");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading, isError, refetch } = useLocations({ page, per_page: 15 });

  useEffect(() => {
    if (openNewFlag) setShowForm(true);
  }, [openNewFlag]);

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Locations"
        description="Terminals, parks and pickup points across your network."
        action={
          <Button onClick={() => setShowForm(true)}>
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
              <Button onClick={() => setShowForm(true)}>
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
                  <TH>Address</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((l) => (
                  <TR key={l.id}>
                    <TD className="font-medium text-slate-900">{l.name}</TD>
                    <TD>{l.city ?? "—"}</TD>
                    <TD>{stateName(l.state)}</TD>
                    <TD className="text-slate-500">{l.address ?? "—"}</TD>
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

      <LocationFormModal open={showForm} onClose={() => setShowForm(false)} />
    </div>
  );
}
