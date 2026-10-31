"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/auth";
import type { ApiResponse, LoginResponse, User } from "@/types/api";

interface LoginPayload {
  email: string;
  password: string;
}

// POST /tenant-onboarding — create a new travel company (tenant) + its admin
// user. Fields marked optional map to the API's nullable company/admin fields.
interface OnboardPayload {
  company_name: string;
  company_email?: string;
  company_phone?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  password: string;
  password_confirmation: string;
}

export function useLogin() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const { data } = await api.post<ApiResponse<LoginResponse>>("/login", payload);
      return data.data;
    },
    onSuccess: (data) => {
      const token = data.token ?? data.access_token ?? "";
      setAuth(token, data.user);
      router.replace("/");
    },
  });
}

// Register a travel company. The API responds 201 and emails a 6-digit OTP to
// the admin; the caller then routes to the verify-OTP step.
export function useRegisterCompany() {
  return useMutation({
    mutationFn: async (payload: OnboardPayload) => {
      const { data } = await api.post<ApiResponse<null>>("/tenant-onboarding", payload);
      return data;
    },
  });
}

// Confirm the admin's email with the OTP. On success the API returns a token,
// so we sign the new admin straight into the dashboard.
export function useVerifyOtp() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: async (payload: { email: string; otp: string }) => {
      const { data } = await api.post<ApiResponse<LoginResponse>>("/verify-otp", payload);
      return data.data;
    },
    onSuccess: (data) => {
      const token = data.token ?? data.access_token ?? "";
      setAuth(token, data.user);
      router.replace("/");
    },
  });
}

// Re-send the OTP to an admin email that hasn't been verified yet.
export function useResendOtp() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { data } = await api.post<ApiResponse<null>>("/resend-otp", { email });
      return data;
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  return useMutation({
    mutationFn: async () => {
      try {
        await api.post("/logout");
      } catch {
        // Ignore — clear local session regardless of server response.
      }
    },
    onSettled: () => {
      logout();
      router.replace("/login");
    },
  });
}

// Refresh the current user/tenant profile from the server.
export function useCurrentUser() {
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);

  return useQuery({
    queryKey: ["current-user"],
    enabled: !!token,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<User>>("/user");
      setUser(data.data);
      return data.data;
    },
  });
}
