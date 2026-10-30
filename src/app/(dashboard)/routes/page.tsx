"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Route as RouteIcon, ArrowRight } from "lucide-react";
import { useRoutes, useCreateRoute, useLocations } from "@/hooks/resources";
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

const schema = z.object({
  origin_id: z.string().min(1, "Origin is required"),
  destination_id: z.string().min(1, "Destination is required"),
  distance: z.string().optional(),
  estimated_duration: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function RouteFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateRoute();
  const locations = useLocations({ per_page: 100 });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const submit = (v: FormValues) =>
    create.mutate(
      {
        origin_id: Number(v.origin_id),
        destination_id: Number(v.destination_id),
        distance: v.distance ? Number(v.distance) : undefined,
        estimated_duration: v.estimated_duration ? Number(v.estimated_duration) : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Route created");
          reset();
          onClose();
        },
        onError: (e) => toast.error(apiErrorMessage(e, "Could not create route")),
      }
    );

  const opts = locations.data?.items ?? [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create route"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(submit)} loading={create.isPending}>
            Create route
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Origin" required error={errors.origin_id?.message}>
            <Select {...register("origin_id")}>
              <option value="">Select…</option>
              {opts.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Destination" required error={errors.destination_id?.message}>
            <Select {...register("destination_id")}>
              <option value="">Select…</option>
              {opts.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Distance (km)">
            <Input type="number" min="0" {...register("distance")} />
          </Field>
          <Field label="Estimated duration (hrs)">
            <Input type="number" min="0" {...register("estimated_duration")} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}

export default function RoutesPage() {
  const openNewFlag = useQueryFlag("new");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading, isError, refetch } = useRoutes({ page, per_page: 15 });

  useEffect(() => {
    if (openNewFlag) setShowForm(true);
  }, [openNewFlag]);

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Routes"
        description="Define the origin–destination pairs your fleet serves."
        action={
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> New route
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
            icon={RouteIcon}
            title="No routes yet"
            description="Create a route to connect two locations."
            action={
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4" /> New route
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Origin</TH>
                  <TH></TH>
                  <TH>Destination</TH>
                  <TH>Distance</TH>
                  <TH>Duration</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((r) => (
                  <TR key={r.id}>
                    <TD className="font-medium text-slate-900">{r.origin?.name ?? "—"}</TD>
                    <TD>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </TD>
                    <TD className="font-medium text-slate-900">{r.destination?.name ?? "—"}</TD>
                    <TD>{r.distance != null ? `${r.distance} km` : "—"}</TD>
                    <TD>
                      {r.estimated_duration != null ? `${r.estimated_duration} hr` : "—"}
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

      <RouteFormModal open={showForm} onClose={() => setShowForm(false)} />
    </div>
  );
}
