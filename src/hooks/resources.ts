"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import {
  useCreate,
  useItem,
  useList,
  useRemove,
  useUpdate,
  type ListParams,
} from "./useResource";
import type {
  ApiResponse,
  Booking,
  BookingStatus,
  Location,
  Route,
  Schedule,
  State,
  Tenant,
  UploadResult,
  UploadType,
  Vehicle,
  VehicleCategory,
  VehicleType,
} from "@/types/api";

// --- Schedules -------------------------------------------------------------
export const useSchedules = (params?: ListParams) => useList<Schedule>("schedules", params);
export const useSchedule = (id: number | null) => useItem<Schedule>("schedules", id);
export const useCreateSchedule = () => useCreate<Schedule>("schedules");
export const useUpdateSchedule = () => useUpdate<Schedule>("schedules");
export const useDeleteSchedule = () => useRemove("schedules");

// --- Bookings --------------------------------------------------------------
export const useBookings = (params?: ListParams) => useList<Booking>("bookings", params);
export const useBooking = (id: number | null) => useItem<Booking>("bookings", id);
export const useCreateBooking = () => useCreate<Booking>("bookings");

export function useUpdateBookingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: BookingStatus }) => {
      const { data } = await api.patch<ApiResponse<Booking>>(`/bookings/${id}/status`, {
        status,
      });
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.patch<ApiResponse<Booking>>(`/bookings/${id}/cancel`, {});
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

// --- Vehicles --------------------------------------------------------------
export const useVehicles = (params?: ListParams) => useList<Vehicle>("vehicles", params);
export const useCreateVehicle = () => useCreate<Vehicle>("vehicles");
export const useUpdateVehicle = () => useUpdate<Vehicle>("vehicles");
export const useDeleteVehicle = () => useRemove("vehicles");

// --- Routes ----------------------------------------------------------------
export const useRoutes = (params?: ListParams) => useList<Route>("routes", params);
export const useCreateRoute = () => useCreate<Route>("routes");

// --- Locations -------------------------------------------------------------
export const useLocations = (params?: ListParams) => useList<Location>("locations", params);
export const useCreateLocation = () => useCreate<Location>("locations");

// --- Vehicle types / categories -------------------------------------------
export const useVehicleTypes = (params?: ListParams) =>
  useList<VehicleType>("vehicle-types", params);
export const useCreateVehicleType = () => useCreate<VehicleType>("vehicle-types");
export const useUpdateVehicleType = () => useUpdate<VehicleType>("vehicle-types");
export const useDeleteVehicleType = () => useRemove("vehicle-types");

export const useVehicleCategories = (params?: ListParams) =>
  useList<VehicleCategory>("vehicle-categories", params);
export const useCreateVehicleCategory = () => useCreate<VehicleCategory>("vehicle-categories");

// --- States ----------------------------------------------------------------
export const useStates = () =>
  useList<State>("states", {}, { staleTime: 1000 * 60 * 60 });

// --- Tenant (authenticated user's own tenant) ------------------------------
export function useUpdateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<Pick<Tenant, "name" | "email" | "phone">>) => {
      const { data } = await api.patch<ApiResponse<Tenant>>("/tenant", body);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["current-user"] }),
  });
}

// --- Image upload ----------------------------------------------------------
// POST /upload/images (multipart). Returns { url, path, type }. Pass modelId
// to have the backend attach the image to that record automatically.
export function useUploadImage() {
  return useMutation({
    mutationFn: async ({
      file,
      type,
      modelId,
    }: {
      file: File;
      type: UploadType;
      modelId?: number;
    }) => {
      const form = new FormData();
      form.append("image", file);
      form.append("type", type);
      if (modelId != null) form.append("model_id", String(modelId));
      const { data } = await api.post<ApiResponse<UploadResult>>("/upload/images", form);
      return data.data;
    },
  });
}
