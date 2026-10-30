import { Badge } from "@/components/ui/badge";
import type { DriverAvailability } from "@/types/api";

export const DRIVER_AVAILABILITY: {
  value: DriverAvailability;
  label: string;
  tone: "green" | "blue" | "amber";
}[] = [
  { value: "available", label: "Available", tone: "green" },
  { value: "on_trip", label: "On a trip", tone: "blue" },
  { value: "unavailable", label: "Unavailable", tone: "amber" },
];

export function availabilityMeta(value?: DriverAvailability | string | null) {
  return (
    DRIVER_AVAILABILITY.find((a) => a.value === value) ?? {
      value: value as DriverAvailability,
      label: value ? String(value).replace(/_/g, " ") : "—",
      tone: "amber" as const,
    }
  );
}

export function AvailabilityBadge({
  value,
}: {
  value?: DriverAvailability | string | null;
}) {
  const meta = availabilityMeta(value);
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
