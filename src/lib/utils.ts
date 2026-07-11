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

// Resolve an image path from the API into a full URL. The API stores relative
// paths like "vehicles/xxx.png" served from {origin}/storage/, but sometimes
// returns an absolute URL — pass those through unchanged.
export function assetUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
  const origin = apiUrl.replace(/\/api\/v1\/?$/, "");
  return `${origin}/storage/${path.replace(/^\/+/, "")}`;
}

// A state may be a nested object ({ name }) or a plain string depending on
// the endpoint. Normalise to a display label.
export function stateName(state?: { name: string } | string | null): string {
  if (!state) return "—";
  return typeof state === "string" ? state : state.name;
}

// Prefer the city for display. Only surface the location name when it differs
// from the city (e.g. "Jabi Motor Park" in the city "Abuja").
export function cityLabel(
  loc?: { name?: string | null; city?: string | null } | null
): { primary: string; secondary?: string } {
  if (!loc) return { primary: "—" };
  const name = loc.name?.trim() ?? "";
  const city = loc.city?.trim() ?? "";
  if (!city) return { primary: name || "—" };
  if (!name || name.toLowerCase() === city.toLowerCase()) return { primary: city };
  return { primary: city, secondary: name };
}
