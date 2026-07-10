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
