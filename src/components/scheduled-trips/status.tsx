import { Badge } from "@/components/ui/badge";
import type { ScheduledTripStatus } from "@/types/api";

// The operational lifecycle, in order, plus display metadata.
export const TRIP_STATUSES: {
  value: ScheduledTripStatus;
  label: string;
  tone: "gray" | "blue" | "green" | "red";
}[] = [
  { value: "not_started", label: "Not started", tone: "gray" },
  { value: "ongoing", label: "Ongoing", tone: "blue" },
  { value: "completed", label: "Completed", tone: "green" },
  { value: "cancelled", label: "Cancelled", tone: "red" },
];

export function tripStatusMeta(status?: ScheduledTripStatus | string | null) {
  return (
    TRIP_STATUSES.find((s) => s.value === status) ?? {
      value: status as ScheduledTripStatus,
      label: status ? String(status).replace(/_/g, " ") : "—",
      tone: "gray" as const,
    }
  );
}

export function TripStatusBadge({
  status,
}: {
  status?: ScheduledTripStatus | string | null;
}) {
  const meta = tripStatusMeta(status);
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
