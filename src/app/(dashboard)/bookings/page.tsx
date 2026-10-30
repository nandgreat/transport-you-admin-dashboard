"use client";

import { useEffect, useState } from "react";
import { Plus, Ticket, Check, X, ArrowRight, Eye, Repeat, Users } from "lucide-react";
import {
  useBookings,
  useUpdateBookingStatus,
  useCancelBooking,
} from "@/hooks/resources";
import { useQueryFlag } from "@/hooks/useQueryFlag";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, LoadingBlock, ErrorState } from "@/components/ui/states";
import { ConfirmDialog } from "@/components/ui/confirm";
import { BookingFormModal } from "@/components/bookings/booking-form";
import { BookingDetailsModal } from "@/components/bookings/booking-details";
import { toast } from "@/components/ui/toaster";
import { apiErrorMessage } from "@/lib/axios";
import { cn, formatCurrency, formatDate, formatTime } from "@/lib/utils";
import type { Booking, BookingStatus } from "@/types/api";

const TABS: { label: string; value: BookingStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Cancelled", value: "cancelled" },
];

export default function BookingsPage() {
  const openNewFlag = useQueryFlag("new");
  const [tab, setTab] = useState<BookingStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [toCancel, setToCancel] = useState<Booking | null>(null);
  const [viewing, setViewing] = useState<Booking | null>(null);

  const params: Record<string, string | number> = { page, per_page: 15 };
  if (tab !== "all") params.status = tab;

  const { data, isLoading, isError, refetch } = useBookings(params);
  const updateStatus = useUpdateBookingStatus();
  const cancel = useCancelBooking();

  useEffect(() => {
    if (openNewFlag) setShowForm(true);
  }, [openNewFlag]);

  const items = data?.items ?? [];

  const confirm = (b: Booking) => {
    updateStatus.mutate(
      { id: b.id, status: "confirmed" },
      {
        onSuccess: () => toast.success(`Booking #${b.id} confirmed`),
        onError: (e) => toast.error(apiErrorMessage(e, "Could not update status")),
      }
    );
  };

  const doCancel = () => {
    if (!toCancel) return;
    cancel.mutate(toCancel.id, {
      onSuccess: () => {
        toast.success("Booking cancelled");
        setToCancel(null);
      },
      onError: (e) => toast.error(apiErrorMessage(e, "Could not cancel booking")),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookings"
        description="Track reservations and manage their status."
        action={
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> New booking
          </Button>
        }
      />

      {/* Status tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => {
              setTab(t.value);
              setPage(1);
            }}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition",
              tab === t.value
                ? "bg-brand-600 text-white"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        {isLoading ? (
          <LoadingBlock />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : items.length === 0 ? (
          <EmptyState icon={Ticket} title="No bookings found" description="Try a different filter or create one manually." />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Booking</TH>
                  <TH>Customer</TH>
                  <TH>Trip</TH>
                  <TH>Passengers</TH>
                  <TH>Amount</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((b) => {
                  const origin = b.schedule?.route?.origin;
                  const destination = b.schedule?.route?.destination;
                  const paxNames = (b.passengers ?? []).map((p) => p.name).filter(Boolean);
                  return (
                    <TR
                      key={b.id}
                      className="cursor-pointer"
                      onClick={() => setViewing(b)}
                    >
                      <TD>
                        <p className="font-medium text-slate-900">#{b.id}</p>
                        <p className="text-xs text-slate-400">{formatDate(b.created_at)}</p>
                      </TD>
                      <TD>
                        <p className="font-medium text-slate-700">{b.customer?.name ?? "—"}</p>
                        {b.customer?.email && (
                          <p className="text-xs text-slate-400">{b.customer.email}</p>
                        )}
                        {b.customer?.phone && (
                          <p className="text-xs text-slate-400">{b.customer.phone}</p>
                        )}
                      </TD>
                      <TD>
                        <div className="flex items-center gap-1.5 font-medium text-slate-700">
                          {origin?.city ?? origin?.name ?? "—"}
                          <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                          {destination?.city ?? destination?.name ?? "—"}
                          {b.is_round_trip && (
                            <Badge tone="blue" className="ml-1">
                              <Repeat className="h-3 w-3" /> Return
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">
                          {formatDate(b.schedule?.departure_time)} ·{" "}
                          {formatTime(b.schedule?.departure_time)}
                          {b.schedule?.vehicle_type?.vehicle_name
                            ? ` · ${b.schedule.vehicle_type.vehicle_name}`
                            : ""}
                        </p>
                      </TD>
                      <TD>
                        <span className="inline-flex items-center gap-1.5 text-slate-700">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          {paxNames.length}
                        </span>
                        {paxNames.length > 0 && (
                          <p className="max-w-[160px] truncate text-xs text-slate-400">
                            {paxNames.join(", ")}
                          </p>
                        )}
                      </TD>
                      <TD className="font-medium text-slate-900">
                        {formatCurrency(b.total_amount)}
                      </TD>
                      <TD>
                        <StatusBadge status={b.status} />
                      </TD>
                      <TD onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setViewing(b)}>
                            <Eye className="h-4 w-4 text-slate-500" /> View
                          </Button>
                          {b.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => confirm(b)}
                              loading={updateStatus.isPending && updateStatus.variables?.id === b.id}
                            >
                              <Check className="h-4 w-4 text-emerald-600" /> Confirm
                            </Button>
                          )}
                          {b.status !== "cancelled" && (
                            <Button variant="ghost" size="sm" onClick={() => setToCancel(b)}>
                              <X className="h-4 w-4 text-red-500" /> Cancel
                            </Button>
                          )}
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

      <BookingFormModal open={showForm} onClose={() => setShowForm(false)} />

      <BookingDetailsModal booking={viewing} onClose={() => setViewing(null)} />

      <ConfirmDialog
        open={!!toCancel}
        title="Cancel booking"
        description={`Cancel booking #${toCancel?.id}? The customer will be notified.`}
        confirmLabel="Cancel booking"
        danger
        loading={cancel.isPending}
        onConfirm={doCancel}
        onCancel={() => setToCancel(null)}
      />
    </div>
  );
}
