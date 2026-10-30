"use client";

import {
  User,
  Mail,
  Phone,
  ArrowRight,
  Bus,
  Users,
  StickyNote,
  Building2,
  Repeat,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime, assetUrl } from "@/lib/utils";
import type { Booking, BookingSchedule } from "@/types/api";

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <Icon className="h-3.5 w-3.5" /> {title}
      </p>
      {children}
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium text-slate-900">{value ?? "—"}</span>
    </div>
  );
}

function TripSummary({ schedule }: { schedule?: BookingSchedule | null }) {
  if (!schedule) return <p className="text-sm text-slate-400">No trip details.</p>;
  const origin = schedule.route?.origin;
  const destination = schedule.route?.destination;
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-center gap-2 font-medium text-slate-900">
        {origin?.city ?? origin?.name ?? "—"}
        <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
        {destination?.city ?? destination?.name ?? "—"}
      </div>
      <div className="mt-1 text-xs text-slate-400">
        {origin?.name}
        {origin?.state ? `, ${origin.state}` : ""} → {destination?.name}
        {destination?.state ? `, ${destination.state}` : ""}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
        <Detail label="Departs" value={formatDateTime(schedule.departure_time)} />
        <Detail label="Arrives" value={formatDateTime(schedule.arrival_time)} />
        <Detail
          label="Vehicle"
          value={
            schedule.vehicle_type?.vehicle_name ? (
              <span className="inline-flex items-center gap-1">
                <Bus className="h-3.5 w-3.5 text-slate-400" />
                {schedule.vehicle_type.vehicle_name}
              </span>
            ) : (
              "—"
            )
          }
        />
        <Detail label="Fare / seat" value={formatCurrency(schedule.fare)} />
        {schedule.route?.distance != null && (
          <Detail label="Distance" value={`${schedule.route.distance} km`} />
        )}
        {schedule.route?.estimated_duration != null && (
          <Detail label="Duration" value={`~${schedule.route.estimated_duration} hrs`} />
        )}
      </div>
    </div>
  );
}

export function BookingDetailsModal({
  booking,
  onClose,
}: {
  booking: Booking | null;
  onClose: () => void;
}) {
  if (!booking) return null;
  const logo = assetUrl(booking.operator?.logo_url);

  return (
    <Modal
      open={!!booking}
      onClose={onClose}
      size="lg"
      title={`Booking #${booking.id}`}
      description={`Created ${formatDateTime(booking.created_at)}`}
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <StatusBadge status={booking.status} />
          <span className="text-2xl font-bold text-slate-900">
            {formatCurrency(booking.total_amount)}
          </span>
        </div>

        {/* Customer */}
        <Section title="Customer" icon={User}>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="font-medium text-slate-900">{booking.customer?.name ?? "—"}</p>
            <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
              {booking.customer?.email && (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> {booking.customer.email}
                </span>
              )}
              {booking.customer?.phone && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> {booking.customer.phone}
                </span>
              )}
            </div>
          </div>
        </Section>

        {/* Trip */}
        <Section title={booking.is_round_trip ? "Outbound trip" : "Trip"} icon={Bus}>
          <TripSummary schedule={booking.schedule} />
        </Section>

        {booking.is_round_trip && booking.return_booking?.schedule && (
          <Section title="Return trip" icon={Repeat}>
            <TripSummary schedule={booking.return_booking.schedule} />
          </Section>
        )}

        {/* Passengers */}
        <Section title={`Passengers (${booking.passengers?.length ?? 0})`} icon={Users}>
          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {(booking.passengers ?? []).map((p, i) => (
              <div key={i} className="flex flex-wrap items-center gap-x-5 gap-y-1 px-3 py-2 text-sm">
                <span className="font-medium text-slate-900">{p.name}</span>
                {p.phone && (
                  <span className="inline-flex items-center gap-1.5 text-slate-500">
                    <Phone className="h-3.5 w-3.5" /> {p.phone}
                  </span>
                )}
                {p.email && (
                  <span className="inline-flex items-center gap-1.5 text-slate-500">
                    <Mail className="h-3.5 w-3.5" /> {p.email}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* Operator + notes */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Section title="Operator" icon={Building2}>
            <div className="flex items-center gap-2">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt="" className="h-8 w-8 rounded-md object-cover" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-400">
                  <Building2 className="h-4 w-4" />
                </div>
              )}
              <span className="text-sm font-medium text-slate-800">
                {booking.operator?.name ?? "—"}
              </span>
            </div>
          </Section>

          {booking.notes && (
            <Section title="Notes" icon={StickyNote}>
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                {booking.notes}
              </p>
            </Section>
          )}
        </div>
      </div>
    </Modal>
  );
}
