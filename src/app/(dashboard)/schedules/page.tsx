"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, ArrowRight, CalendarClock } from "lucide-react";
import { useSchedules, useDeleteSchedule } from "@/hooks/resources";
import { useQueryFlag } from "@/hooks/useQueryFlag";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, LoadingBlock, ErrorState } from "@/components/ui/states";
import { ConfirmDialog } from "@/components/ui/confirm";
import { ScheduleFormModal } from "@/components/schedules/schedule-form";
import { toast } from "@/components/ui/toaster";
import { apiErrorMessage } from "@/lib/axios";
import { cityLabel, formatCurrency, formatDateTime } from "@/lib/utils";
import type { Schedule } from "@/types/api";

export default function SchedulesPage() {
  const openNewFlag = useQueryFlag("new");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [toDelete, setToDelete] = useState<Schedule | null>(null);

  const { data, isLoading, isError, refetch } = useSchedules({ page, per_page: 15 });
  const del = useDeleteSchedule();

  useEffect(() => {
    if (openNewFlag) setShowForm(true);
  }, [openNewFlag]);

  const items = data?.items ?? [];

  const confirmDelete = () => {
    if (!toDelete) return;
    del.mutate(toDelete.id, {
      onSuccess: () => {
        toast.success("Schedule deleted");
        setToDelete(null);
      },
      onError: (e) => toast.error(apiErrorMessage(e, "Could not delete schedule")),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedules"
        description="Manage one-off trips and recurring weekly schedules."
        action={
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> New schedule
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
            icon={CalendarClock}
            title="No schedules yet"
            description="Create your first schedule to start accepting bookings."
            action={
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4" /> New schedule
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Route</TH>
                  <TH>Vehicle</TH>
                  <TH>Departure</TH>
                  <TH>Arrival</TH>
                  <TH>Seats</TH>
                  <TH>Fare</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((s) => {
                  const origin = cityLabel(
                    s.route?.origin ?? (s.origin_city ? { city: s.origin_city } : null)
                  );
                  const destination = cityLabel(
                    s.route?.destination ?? (s.destination_city ? { city: s.destination_city } : null)
                  );
                  return (
                    <TR key={s.id}>
                      <TD>
                        <div className="flex items-center gap-2 text-slate-900">
                          <Endpoint label={origin} />
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <Endpoint label={destination} />
                        </div>
                        {s.is_round_trip && (
                          <Badge tone="blue" className="mt-1">
                            Round trip
                          </Badge>
                        )}
                      </TD>
                      <TD className="text-slate-600">{s.vehicle_type?.vehicle_name ?? "—"}</TD>
                      <TD className="text-slate-600">{formatDateTime(s.departure_time)}</TD>
                      <TD className="text-slate-600">{formatDateTime(s.arrival_time)}</TD>
                      <TD>{s.available_seats ?? "—"}</TD>
                      <TD className="font-medium text-slate-900">{formatCurrency(s.fare)}</TD>
                      <TD>{s.status ? <StatusBadge status={s.status} /> : "—"}</TD>
                      <TD className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setToDelete(s)}
                          aria-label="Delete schedule"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
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

      <ScheduleFormModal open={showForm} onClose={() => setShowForm(false)} />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete schedule"
        description={
          toDelete
            ? `Delete the ${cityLabel(
                toDelete.route?.origin ?? (toDelete.origin_city ? { city: toDelete.origin_city } : null)
              ).primary} → ${cityLabel(
                toDelete.route?.destination ??
                  (toDelete.destination_city ? { city: toDelete.destination_city } : null)
              ).primary} schedule? This cannot be undone.`
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

// Renders a route endpoint: the city, with the location name beneath only when
// it differs from the city.
function Endpoint({ label }: { label: { primary: string; secondary?: string } }) {
  return (
    <span className="leading-tight">
      <span className="font-medium">{label.primary}</span>
      {label.secondary && (
        <span className="block text-xs font-normal text-slate-400">{label.secondary}</span>
      )}
    </span>
  );
}
