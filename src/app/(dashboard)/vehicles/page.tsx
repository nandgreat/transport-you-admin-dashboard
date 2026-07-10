"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Bus } from "lucide-react";
import { useVehicles, useDeleteVehicle } from "@/hooks/resources";
import { useQueryFlag } from "@/hooks/useQueryFlag";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, LoadingBlock, ErrorState } from "@/components/ui/states";
import { ConfirmDialog } from "@/components/ui/confirm";
import { VehicleFormModal } from "@/components/vehicles/vehicle-form";
import { toast } from "@/components/ui/toaster";
import { apiErrorMessage } from "@/lib/axios";
import type { Vehicle } from "@/types/api";

export default function VehiclesPage() {
  const openNewFlag = useQueryFlag("new");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [toDelete, setToDelete] = useState<Vehicle | null>(null);

  const { data, isLoading, isError, refetch } = useVehicles({ page, per_page: 15 });
  const del = useDeleteVehicle();

  useEffect(() => {
    if (openNewFlag) setShowForm(true);
  }, [openNewFlag]);

  const items = data?.items ?? [];

  const confirmDelete = () => {
    if (!toDelete) return;
    del.mutate(toDelete.id, {
      onSuccess: () => {
        toast.success("Vehicle removed");
        setToDelete(null);
      },
      onError: (e) => toast.error(apiErrorMessage(e, "Could not remove vehicle")),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicles"
        description="Manage the vehicles in your fleet."
        action={
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> Add vehicle
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
            icon={Bus}
            title="No vehicles yet"
            description="Add your first vehicle to start assigning it to trips."
            action={
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4" /> Add vehicle
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Vehicle</TH>
                  <TH>Registration</TH>
                  <TH>Type</TH>
                  <TH>Capacity</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((v) => (
                  <TR key={v.id}>
                    <TD className="font-medium text-slate-900">{v.name ?? `Vehicle #${v.id}`}</TD>
                    <TD className="text-slate-600">
                      {v.registration_number ?? v.plate_number ?? "—"}
                    </TD>
                    <TD>
                      {v.vehicle_type?.vehicle_name ? (
                        <Badge tone="blue">{v.vehicle_type.vehicle_name}</Badge>
                      ) : (
                        "—"
                      )}
                    </TD>
                    <TD>{v.capacity ?? "—"}</TD>
                    <TD className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setToDelete(v)}
                        aria-label="Delete vehicle"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
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

      <VehicleFormModal open={showForm} onClose={() => setShowForm(false)} />

      <ConfirmDialog
        open={!!toDelete}
        title="Remove vehicle"
        description={`Remove ${toDelete?.name ?? "this vehicle"} from your fleet?`}
        confirmLabel="Remove"
        danger
        loading={del.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
