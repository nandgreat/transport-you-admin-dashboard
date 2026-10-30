"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { apiErrorMessage } from "@/lib/axios";
import { useCreateBooking, useSchedules } from "@/hooks/resources";
import { formatCurrency } from "@/lib/utils";
import type { BookingStatus, Passenger } from "@/types/api";

const emptyPassenger = (): Passenger => ({ name: "", phone: "", email: "" });

export function BookingFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateBooking();
  const schedules = useSchedules({ per_page: 100 });

  const [scheduleId, setScheduleId] = useState("");
  const [status, setStatus] = useState<BookingStatus>("pending");
  const [notes, setNotes] = useState("");
  const [passengers, setPassengers] = useState<Passenger[]>([emptyPassenger()]);
  const [errors, setErrors] = useState<{ schedule?: string; passengers?: Record<number, string> }>(
    {}
  );

  const scheduleOptions = schedules.data?.items ?? [];
  const selected = scheduleOptions.find((s) => String(s.id) === scheduleId);
  const fare = Number(selected?.fare ?? 0);
  const estimatedTotal = fare * passengers.length;

  const reset = () => {
    setScheduleId("");
    setStatus("pending");
    setNotes("");
    setPassengers([emptyPassenger()]);
    setErrors({});
  };

  const updatePassenger = (i: number, key: keyof Passenger, value: string) =>
    setPassengers((p) => p.map((pax, idx) => (idx === i ? { ...pax, [key]: value } : pax)));
  const addPassenger = () => setPassengers((p) => [...p, emptyPassenger()]);
  const removePassenger = (i: number) =>
    setPassengers((p) => (p.length > 1 ? p.filter((_, idx) => idx !== i) : p));

  const validate = () => {
    const next: { schedule?: string; passengers?: Record<number, string> } = {};
    if (!scheduleId) next.schedule = "Schedule is required";
    const paxErrs: Record<number, string> = {};
    passengers.forEach((p, i) => {
      if (!p.name.trim()) paxErrs[i] = "Name is required";
    });
    if (Object.keys(paxErrs).length) next.passengers = paxErrs;
    setErrors(next);
    return !next.schedule && !next.passengers;
  };

  const submit = () => {
    if (!validate()) return;
    create.mutate(
      {
        schedule_id: Number(scheduleId),
        passengers: passengers.map((p) => ({
          name: p.name.trim(),
          phone: p.phone || undefined,
          email: p.email || undefined,
        })),
        notes: notes || undefined,
        status,
      },
      {
        onSuccess: () => {
          toast.success("Booking created");
          reset();
          onClose();
        },
        onError: (e) => toast.error(apiErrorMessage(e, "Could not create booking")),
      }
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create booking"
      description="Manually create a booking on behalf of a customer."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} loading={create.isPending}>
            Create booking
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Schedule" required error={errors.schedule}>
            <Select value={scheduleId} onChange={(e) => setScheduleId(e.target.value)}>
              <option value="">Select a schedule…</option>
              {scheduleOptions.map((s) => {
                const from = s.route?.origin?.city ?? s.route?.origin?.name ?? s.origin_city ?? "?";
                const to =
                  s.route?.destination?.city ?? s.route?.destination?.name ?? s.destination_city ?? "?";
                return (
                  <option key={s.id} value={s.id}>
                    {from} → {to} · #{s.id} · {formatCurrency(s.fare)}
                  </option>
                );
              })}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as BookingStatus)}>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </Field>
        </div>

        {/* Passengers */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">
              Passengers ({passengers.length})
            </p>
            <Button variant="outline" size="sm" onClick={addPassenger}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
          <div className="space-y-3">
            {passengers.map((p, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Passenger {i + 1}</span>
                  {passengers.length > 1 && (
                    <button
                      onClick={() => removePassenger(i)}
                      className="text-slate-400 hover:text-red-500"
                      aria-label="Remove passenger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Field label="Full name" required error={errors.passengers?.[i]}>
                    <Input
                      value={p.name}
                      onChange={(e) => updatePassenger(i, "name", e.target.value)}
                      placeholder="Jane Doe"
                    />
                  </Field>
                  <Field label="Phone">
                    <Input
                      value={p.phone ?? ""}
                      onChange={(e) => updatePassenger(i, "phone", e.target.value)}
                      placeholder="Optional"
                    />
                  </Field>
                  <Field label="Email">
                    <Input
                      type="email"
                      value={p.email ?? ""}
                      onChange={(e) => updatePassenger(i, "email", e.target.value)}
                      placeholder="Optional"
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Field label="Notes">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything the operator should know?"
          />
        </Field>

        {selected && (
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
            <span className="text-sm text-slate-500">
              Estimated total · {passengers.length} seat{passengers.length > 1 ? "s" : ""}
            </span>
            <span className="text-lg font-bold text-slate-900">
              {formatCurrency(estimatedTotal)}
            </span>
          </div>
        )}
      </div>
    </Modal>
  );
}
