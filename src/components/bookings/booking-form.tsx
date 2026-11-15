"use client";

import { useState } from "react";
import { Plus, Trash2, Armchair, CalendarClock } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { apiErrorMessage } from "@/lib/axios";
import {
  useCreateBooking,
  useSchedules,
  useSchedule,
  useRecurringSeats,
} from "@/hooks/resources";
import { formatCurrency, formatDate, formatTime, cn } from "@/lib/utils";
import type { BookingStatus, Passenger } from "@/types/api";

const emptyPassenger = (): Passenger => ({ name: "", phone: "", email: "" });

const DOW = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const DOW_ABBR: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function BookingFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateBooking();
  const schedules = useSchedules({ per_page: 100 });
  const today = ymd(new Date());

  const [scheduleId, setScheduleId] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [status, setStatus] = useState<BookingStatus>("pending");
  const [notes, setNotes] = useState("");
  const [passengers, setPassengers] = useState<Passenger[]>([emptyPassenger()]);
  // Chosen seat numbers, ordered — passenger i is assigned seats[i].
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [errors, setErrors] = useState<{
    schedule?: string;
    date?: string;
    seats?: string;
    passengers?: Record<number, string>;
  }>({});

  const scheduleOptions = schedules.data?.items ?? [];
  const selected = scheduleOptions.find((s) => String(s.id) === scheduleId);
  const isRecurring = selected?.type === "recurring" || !!selected?.days_of_week?.length;

  // --- Travel date handling -------------------------------------------------
  const oneOffDate = !isRecurring ? (selected?.departure_time ?? "").slice(0, 10) : "";
  const days = selected?.days_of_week ?? [];
  const startDate = selected?.start_date ?? "";
  const endDate = selected?.schedule_end_date ?? selected?.end_date ?? "";
  const minDate = startDate && startDate > today ? startDate : today;

  const dateMatchesPattern = (d: string) => {
    if (!d) return false;
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    const dow = DOW[new Date(`${d}T00:00:00`).getDay()];
    return days.length === 0 || days.includes(dow);
  };
  const dateValid = isRecurring ? dateMatchesPattern(travelDate) : true;

  // --- Seat map source ------------------------------------------------------
  const oneOffId = selected && !isRecurring ? Number(scheduleId) : null;
  const detail = useSchedule(oneOffId);
  const groupId = selected && isRecurring ? Number(scheduleId) : null;
  const recurring = useRecurringSeats(groupId, dateValid ? travelDate : null);

  const seatSelectionEnabled = isRecurring
    ? recurring.data?.seat_selection_enabled ?? !!selected?.seat_selection_enabled
    : (detail.data ?? selected)?.seat_selection_enabled ?? false;

  const seatList: { number: number; available: boolean }[] = isRecurring
    ? (recurring.data?.seats ?? []).map((s) => ({ number: s.number, available: s.status === "available" }))
    : (detail.data?.seats ?? selected?.seats ?? []);

  const seatsLoading = isRecurring ? recurring.isLoading : detail.isLoading;
  const showSeatSection = !!selected && seatSelectionEnabled && (!isRecurring || dateValid);

  const fare = Number(selected?.fare ?? 0);
  const estimatedTotal = fare * passengers.length;

  const reset = () => {
    setScheduleId("");
    setTravelDate("");
    setStatus("pending");
    setNotes("");
    setPassengers([emptyPassenger()]);
    setSelectedSeats([]);
    setErrors({});
  };

  const changeSchedule = (v: string) => {
    setScheduleId(v);
    setTravelDate("");
    setSelectedSeats([]);
  };
  const changeDate = (v: string) => {
    setTravelDate(v);
    setSelectedSeats([]); // availability differs per date
  };

  const updatePassenger = (i: number, key: keyof Passenger, value: string) =>
    setPassengers((p) => p.map((pax, idx) => (idx === i ? { ...pax, [key]: value } : pax)));
  const addPassenger = () => setPassengers((p) => [...p, emptyPassenger()]);
  const removePassenger = (i: number) =>
    setPassengers((p) => {
      if (p.length <= 1) return p;
      const next = p.filter((_, idx) => idx !== i);
      setSelectedSeats((s) => s.slice(0, next.length));
      return next;
    });

  const toggleSeat = (n: number) => {
    setSelectedSeats((s) => {
      if (s.includes(n)) return s.filter((x) => x !== n);
      if (s.length >= passengers.length) {
        toast.error(
          `You've selected ${passengers.length} seat${passengers.length > 1 ? "s" : ""}. Deselect one first or add a passenger.`
        );
        return s;
      }
      return [...s, n];
    });
  };

  const validate = () => {
    const next: typeof errors = {};
    if (!scheduleId) next.schedule = "Schedule is required";
    if (isRecurring && !travelDate) next.date = "Select a travel date";
    else if (isRecurring && !dateValid)
      next.date = "This schedule doesn't run on the selected date";

    const paxErrs: Record<number, string> = {};
    passengers.forEach((p, i) => {
      if (!p.name.trim()) paxErrs[i] = "Name is required";
      else if (!p.phone?.trim()) paxErrs[i] = "Phone is required";
    });
    if (Object.keys(paxErrs).length) next.passengers = paxErrs;

    if (showSeatSection && selectedSeats.length !== passengers.length) {
      next.seats = `Select exactly ${passengers.length} seat${passengers.length > 1 ? "s" : ""} (${selectedSeats.length} selected).`;
    }

    setErrors(next);
    return !next.schedule && !next.date && !next.seats && !next.passengers;
  };

  const submit = () => {
    if (!validate()) return;

    const pax = passengers.map((p, i) => ({
      name: p.name.trim(),
      phone: p.phone?.trim() || undefined,
      email: p.email?.trim() || undefined,
      ...(showSeatSection && selectedSeats[i] ? { seat_number: selectedSeats[i] } : {}),
    }));

    const body = isRecurring
      ? { schedule_group_id: Number(scheduleId), travel_date: travelDate, passengers: pax, notes: notes || undefined, status }
      : { schedule_id: Number(scheduleId), passengers: pax, notes: notes || undefined, status };

    create.mutate(body, {
      onSuccess: () => {
        toast.success("Booking created");
        reset();
        onClose();
      },
      onError: (e) => toast.error(apiErrorMessage(e, "Could not create booking")),
    });
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
            <Select value={scheduleId} onChange={(e) => changeSchedule(e.target.value)}>
              <option value="">Select a schedule…</option>
              {scheduleOptions.map((s) => {
                const from = s.route?.origin?.city ?? s.route?.origin?.name ?? s.origin_city ?? "?";
                const to =
                  s.route?.destination?.city ?? s.route?.destination?.name ?? s.destination_city ?? "?";
                const kind = s.type === "recurring" || s.days_of_week?.length ? "recurring" : "one-off";
                return (
                  <option key={`${s.type ?? "one_off"}-${s.id}`} value={s.id}>
                    {from} → {to} · {kind} · {formatCurrency(s.fare)}
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

        {/* Travel date */}
        {selected && (
          <div>
            {isRecurring ? (
              <Field
                label="Travel date"
                required
                error={errors.date}
                hint={
                  days.length
                    ? `Runs on: ${days.map((d) => DOW_ABBR[d] ?? d).join(", ")}${
                        endDate ? ` · until ${formatDate(endDate)}` : ""
                      }`
                    : undefined
                }
              >
                <Input
                  type="date"
                  value={travelDate}
                  min={minDate}
                  max={endDate || undefined}
                  onChange={(e) => changeDate(e.target.value)}
                  className="sm:w-64"
                />
              </Field>
            ) : (
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
                <CalendarClock className="h-4 w-4 text-slate-400" />
                Travel date:{" "}
                <span className="font-medium text-slate-800">
                  {oneOffDate ? formatDate(selected.departure_time) : "—"}
                  {selected.departure_time ? ` · ${formatTime(selected.departure_time)}` : ""}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Seat selection */}
        {showSeatSection && (
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <Armchair className="h-4 w-4 text-slate-400" /> Select seats
              </p>
              <span className={cn("text-xs", errors.seats ? "text-red-500" : "text-slate-400")}>
                {selectedSeats.length}/{passengers.length} selected
              </span>
            </div>

            {seatsLoading ? (
              <p className="text-sm text-slate-400">Loading seat map…</p>
            ) : seatList.length === 0 ? (
              <p className="text-sm text-slate-400">No seat map available for this trip.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {seatList.map((seat) => {
                    const order = selectedSeats.indexOf(seat.number);
                    const isSelected = order !== -1;
                    const taken = !seat.available && !isSelected;
                    return (
                      <button
                        key={seat.number}
                        type="button"
                        disabled={taken}
                        onClick={() => toggleSeat(seat.number)}
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-md border text-sm font-medium transition",
                          isSelected
                            ? "border-brand-600 bg-brand-600 text-white"
                            : taken
                            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300 line-through"
                            : "border-slate-300 bg-white text-slate-700 hover:border-brand-400"
                        )}
                        title={taken ? "Taken" : isSelected ? `Passenger ${order + 1}` : "Available"}
                      >
                        {seat.number}
                      </button>
                    );
                  })}
                </div>
                {errors.seats && <p className="mt-2 text-xs font-medium text-red-500">{errors.seats}</p>}
                <p className="mt-2 text-xs text-slate-400">
                  Seats are assigned to passengers in the order you pick them.
                </p>
              </>
            )}
          </div>
        )}

        {/* Passengers */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Passengers ({passengers.length})</p>
            <Button variant="outline" size="sm" onClick={addPassenger}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
          <div className="space-y-3">
            {passengers.map((p, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    Passenger {i + 1}
                    {showSeatSection && (
                      <span className="ml-2 font-normal text-slate-400">
                        {selectedSeats[i] ? `· Seat ${selectedSeats[i]}` : "· no seat yet"}
                      </span>
                    )}
                  </span>
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
                  <Field label="Phone" required>
                    <Input
                      value={p.phone ?? ""}
                      onChange={(e) => updatePassenger(i, "phone", e.target.value)}
                      placeholder="08012345678"
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
            <span className="text-lg font-bold text-slate-900">{formatCurrency(estimatedTotal)}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}
