"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, ArrowRight, CalendarClock, Eye, Pencil } from "lucide-react";
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
import { ScheduleEditModal } from "@/components/schedules/schedule-edit";
import { ScheduleDetailsModal } from "@/components/schedules/schedule-details";
import { toast } from "@/components/ui/toaster";
import { apiErrorMessage } from "@/lib/axios";
import { cityLabel, formatCurrency, formatDate, assetUrl } from "@/lib/utils";
import { Bus } from "lucide-react";
import type { Schedule } from "@/types/api";

const DAY_ABBR: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

function formatWeekDays(days?: string[] | null): string {
  if (!days || days.length === 0) return "—";
  return days.map((d) => DAY_ABBR[d.toLowerCase()] ?? d).join(", ");
}

export default function SchedulesPage() {
  const openNewFlag = useQueryFlag("new");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [toDelete, setToDelete] = useState<Schedule | null>(null);
  const [viewing, setViewing] = useState<Schedule | null>(null);
  const [editing, setEditing] = useState<Schedule | null>(null);

  const { data, isLoading, isError, refetch } = useSchedules({ page, per_page: 15 });
  const del = useDeleteSchedule();

  useEffect(() => {
    if (openNewFlag) setShowForm(true);
  }, [openNewFlag]);

  const items = data?.items ?? [];
  // Running serial number across pages for the S/No column.
  const serialBase =
    ((data?.meta?.current_page ?? page) - 1) * (data?.meta?.per_page ?? 15);

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
            {/* Mobile: card list */}
            <div className="space-y-3 p-4 lg:hidden">
              {items.map((s, idx) => (
                <ScheduleCard
                  key={`m-${s.type ?? "one_off"}-${s.id}`}
                  schedule={s}
                  serial={serialBase + idx + 1}
                  onView={() => setViewing(s)}
                  onEdit={() => setEditing(s)}
                  onDelete={() => setToDelete(s)}
                />
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden lg:block">
            <Table className="min-w-[940px]">
              <THead>
                <TR>
                  <TH>S/No</TH>
                  <TH>Vehicle</TH>
                  <TH>Route</TH>
                  <TH>Week days</TH>
                  <TH>Status</TH>
                  <TH>Amount</TH>
                  <TH>Schedule End Date</TH>
                  <TH>Date Created</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((s, idx) => {
                  const origin = cityLabel(
                    s.route?.origin ?? (s.origin_city ? { city: s.origin_city } : null)
                  );
                  const destination = cityLabel(
                    s.route?.destination ?? (s.destination_city ? { city: s.destination_city } : null)
                  );
                  const vehicleImg = assetUrl(s.vehicle_type?.image_url);
                  const isRecurring = s.type === "recurring" || !!s.days_of_week?.length;
                  return (
                    <TR
                      key={`${s.type ?? "one_off"}-${s.id}`}
                      className="cursor-pointer"
                      onClick={() => setViewing(s)}
                    >
                      <TD className="text-slate-500">{serialBase + idx + 1}</TD>
                      <TD className="whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          {vehicleImg ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={vehicleImg}
                              alt=""
                              className="h-9 w-12 shrink-0 rounded-md border border-slate-200 object-cover"
                            />
                          ) : (
                            <div className="flex h-9 w-12 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-400">
                              <Bus className="h-4 w-4" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-slate-900">
                              {s.vehicle_type?.vehicle_name ?? "—"}
                            </p>
                            {s.vehicle_type?.category?.vehicle_category_name && (
                              <p className="text-xs text-slate-500">
                                {s.vehicle_type.category.vehicle_category_name}
                              </p>
                            )}
                          </div>
                        </div>
                      </TD>
                      <TD>
                        <div className="flex items-center gap-2 text-slate-900">
                          <Endpoint label={origin} />
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <Endpoint label={destination} />
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <Badge tone={isRecurring ? "purple" : "gray"}>
                            {isRecurring ? "Recurring" : "One-off"}
                          </Badge>
                          {s.is_round_trip && <Badge tone="blue">Round trip</Badge>}
                        </div>
                      </TD>

                      <TD className="text-slate-600">
                        {s.days_of_week?.length ? (
                          formatWeekDays(s.days_of_week)
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TD>
                      <TD>{s.status ? <StatusBadge status={s.status} /> : "—"}</TD>
                      <TD className="whitespace-nowrap font-medium text-slate-900">
                        {formatCurrency(s.fare)}
                      </TD>
                      <TD className="whitespace-nowrap text-slate-600">
                        {s.schedule_end_date ? formatDate(s.schedule_end_date) : "—"}
                      </TD>
                      <TD className="whitespace-nowrap text-slate-500">
                        {formatDate(s.created_at)}
                      </TD>
                      <TD onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewing(s)}
                          >
                            <Eye className="h-4 w-4 text-slate-500" /> View
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditing(s)}
                            aria-label="Edit schedule"
                          >
                            <Pencil className="h-4 w-4 text-slate-500" />
                          </Button>
                          {!isRecurring && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setToDelete(s)}
                              aria-label="Delete schedule"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
            </div>
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

      <ScheduleEditModal schedule={editing} onClose={() => setEditing(null)} />

      <ScheduleDetailsModal schedule={viewing} onClose={() => setViewing(null)} />

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
      <span className="whitespace-nowrap font-medium">{label.primary}</span>
      {label.secondary && (
        <span className="block whitespace-nowrap text-xs font-normal text-slate-400">
          {label.secondary}
        </span>
      )}
    </span>
  );
}

// Shared per-row derived values for both the table and the mobile card.
function scheduleMeta(s: Schedule) {
  return {
    origin: cityLabel(s.route?.origin ?? (s.origin_city ? { city: s.origin_city } : null)),
    destination: cityLabel(
      s.route?.destination ?? (s.destination_city ? { city: s.destination_city } : null)
    ),
    vehicleImg: assetUrl(s.vehicle_type?.image_url),
    isRecurring: s.type === "recurring" || !!s.days_of_week?.length,
  };
}

// Mobile-friendly card for a single schedule.
function ScheduleCard({
  schedule: s,
  serial,
  onView,
  onEdit,
  onDelete,
}: {
  schedule: Schedule;
  serial: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { origin, destination, vehicleImg, isRecurring } = scheduleMeta(s);
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-start gap-3">
        {vehicleImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vehicleImg}
            alt=""
            className="h-11 w-14 shrink-0 rounded-md border border-slate-200 object-cover"
          />
        ) : (
          <div className="flex h-11 w-14 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-400">
            <Bus className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-slate-400">#{serial}</p>
              <p className="font-semibold text-slate-900">{s.vehicle_type?.vehicle_name ?? "—"}</p>
              {s.vehicle_type?.category?.vehicle_category_name && (
                <p className="text-xs text-slate-500">
                  {s.vehicle_type.category.vehicle_category_name}
                </p>
              )}
            </div>
            {s.status ? <StatusBadge status={s.status} /> : null}
          </div>

          <div className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-900">
            {origin.primary}
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            {destination.primary}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <Badge tone={isRecurring ? "purple" : "gray"}>
              {isRecurring ? "Recurring" : "One-off"}
            </Badge>
            {s.is_round_trip && <Badge tone="blue">Round trip</Badge>}
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <Meta label="Amount" value={formatCurrency(s.fare)} />
            <Meta
              label="Week days"
              value={s.days_of_week?.length ? formatWeekDays(s.days_of_week) : "—"}
            />
            <Meta
              label="End date"
              value={s.schedule_end_date ? formatDate(s.schedule_end_date) : "—"}
            />
            <Meta label="Created" value={formatDate(s.created_at)} />
          </dl>

          <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
            <Button variant="outline" size="sm" onClick={onView} className="flex-1">
              <Eye className="h-4 w-4" /> View
            </Button>
            <Button variant="outline" size="sm" onClick={onEdit} aria-label="Edit schedule">
              <Pencil className="h-4 w-4 text-slate-500" />
            </Button>
            {!isRecurring && (
              <Button variant="outline" size="sm" onClick={onDelete} aria-label="Delete schedule">
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-700">{value}</dd>
    </div>
  );
}
