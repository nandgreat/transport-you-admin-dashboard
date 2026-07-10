// Tiny classnames helper (no external dep).
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

const NGN = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export function formatCurrency(value?: number | string | null): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "—";
  return NGN.format(n);
}

// API dates are UTC strings like "2026-07-20 06:00:00" or ISO.
function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  // Convert "YYYY-MM-DD HH:mm:ss" to ISO-ish so Date parses reliably.
  const normalised = value.includes("T") ? value : value.replace(" ", "T");
  const d = new Date(normalised);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDateTime(value?: string | null): string {
  const d = parseDate(value);
  if (!d) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(value?: string | null): string {
  const d = parseDate(value);
  if (!d) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(value?: string | null): string {
  const d = parseDate(value);
  if (!d) return "—";
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function initials(first?: string, last?: string): string {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
}

// A state may be a nested object ({ name }) or a plain string depending on
// the endpoint. Normalise to a display label.
export function stateName(state?: { name: string } | string | null): string {
  if (!state) return "—";
  return typeof state === "string" ? state : state.name;
}
