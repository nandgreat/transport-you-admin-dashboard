import axios from "axios";
import { useAuthStore } from "@/store/auth";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1",
  headers: { Accept: "application/json" },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    // Auto-logout on 401 (expired / invalid token)
    if (error?.response?.status === 401) {
      const { token, logout } = useAuthStore.getState();
      if (token) {
        logout();
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

// Turn a leaked raw database error into something a user can understand.
function friendlyDbMessage(message: string): string | null {
  const m = message.toLowerCase();
  // Postgres: 23503 foreign_key_violation / 23001 restrict_violation
  if (
    m.includes("foreign key constraint") ||
    m.includes("restrict violation") ||
    m.includes("violates") ||
    m.includes("sqlstate")
  ) {
    return "This record can't be deleted because it's still in use by other records.";
  }
  return null;
}

// Normalise an axios error into a human-friendly message.
export function apiErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string; errors?: Record<string, string[]> }
      | undefined;
    if (data?.errors) {
      const first = Object.values(data.errors)[0];
      if (first?.[0]) return first[0];
    }
    if (data?.message) {
      // Never surface a raw SQL / constraint error to the user.
      return friendlyDbMessage(data.message) ?? data.message;
    }
    if (error.message) return error.message;
  }
  return fallback;
}

export default api;
