import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types/api";

interface AuthState {
  token: string | null;
  user: User | null;
  hydrated: boolean;
  setAuth: (token: string, user: User) => void;
  setUser: (user: User) => void;
  logout: () => void;
  setHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      hydrated: false,
      setAuth: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null }),
      setHydrated: (v) => set({ hydrated: v }),
    }),
    {
      name: "transport-you-auth",
      partialize: (s) => ({ token: s.token, user: s.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);

// ---------------------------------------------------------------------------
// Selectors / helpers
// ---------------------------------------------------------------------------

export const roleNames = (user: User | null): string[] =>
  user?.roles?.map((r) => r.name) ?? [];

export const isSuperAdmin = (user: User | null): boolean =>
  roleNames(user).some((n) => n === "super_admin" || n === "super-admin");

export const primaryRole = (user: User | null): string => roleNames(user)[0] ?? "admin";

export const displayName = (user: User | null): string =>
  user ? `${user.first_name} ${user.last_name}`.trim() : "";
