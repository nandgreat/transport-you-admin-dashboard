"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  BookingSummary,
  City,
  Driver,
  DriverPayload,
  DriverTripsResult,
  Location,
  Route,
  Schedule,
  ScheduledTrip,
  ScheduledTripStatus,
  SeatArrangementType,
  State,
  Tenant,
  TenantCompany,
  TenantCreatePayload,
  TenantUpdatePayload,
  TripManifest,
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

// Recurring patterns are edited via their own endpoint, but they share the
// unified /schedules list, so invalidate that on success.
export function useUpdateScheduleGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: number | string; body: Record<string, unknown> }) => {
      const { data } = await api.patch<ApiResponse<Schedule>>(`/schedule-groups/${id}`, body);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedules"] }),
  });
}

// --- Scheduled trips -------------------------------------------------------
// Concrete, dated trips materialised from one-off schedules and recurring
// groups. Managed operationally (manifest, trip lifecycle) rather than created.
export const useScheduledTrips = (params?: ListParams) =>
  useList<ScheduledTrip>("scheduled-trips", params);
export const useScheduledTrip = (id: number | null) =>
  useItem<ScheduledTrip>("scheduled-trips", id);

// Passenger manifest + check-in state for a single trip.
export function useTripManifest(id: number | string | null) {
  return useQuery<TripManifest>({
    queryKey: ["scheduled-trips", "manifest", id],
    enabled: id !== null && id !== undefined,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<TripManifest>>(
        `/scheduled-trips/${id}/passengers`
      );
      return data.data;
    },
  });
}

// Assign a vehicle + driver to a trip. The vehicle must match the trip's
// vehicle type and the driver must be an active driver of the tenant.
export function useAssignTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      vehicle_id,
      driver_id,
    }: {
      id: number | string;
      vehicle_id: number;
      driver_id: number;
    }) => {
      const { data } = await api.patch<ApiResponse<ScheduledTrip>>(
        `/scheduled-trips/${id}/assignment`,
        { vehicle_id, driver_id }
      );
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scheduled-trips"] }),
  });
}

// Clear a trip's vehicle/driver assignment.
export function useUnassignTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number | string) => {
      const { data } = await api.delete<ApiResponse<ScheduledTrip>>(
        `/scheduled-trips/${id}/assignment`
      );
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scheduled-trips"] }),
  });
}

// Advance a trip's lifecycle. The API treats `cancelled` as a heavy action
// that also cancels the trip's bookings.
export function useUpdateTripStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: number | string;
      status: ScheduledTripStatus;
    }) => {
      const { data } = await api.patch<ApiResponse<ScheduledTrip>>(
        `/scheduled-trips/${id}/status`,
        { status }
      );
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scheduled-trips"] }),
  });
}

// --- Bookings --------------------------------------------------------------
export const useBookings = (params?: ListParams) => useList<Booking>("bookings", params);
export const useBooking = (id: number | null) => useItem<Booking>("bookings", id);
export const useCreateBooking = () => useCreate<Booking>("bookings");

// Aggregate booking totals for the dashboard.
export function useBookingSummary() {
  return useQuery<BookingSummary>({
    queryKey: ["bookings", "summary"],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<BookingSummary>>("/bookings/summary");
      return data.data;
    },
  });
}

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

// --- Drivers ---------------------------------------------------------------
export const useDrivers = (params?: ListParams) => useList<Driver>("drivers", params);
export const useCreateDriver = () => useCreate<Driver, DriverPayload>("drivers");
export const useUpdateDriver = () => useUpdate<Driver, DriverPayload>("drivers");
export const useDeleteDriver = () => useRemove("drivers");

// A driver's trips bucketed into assigned / ongoing / completed, with counts.
export function useDriverTrips(id: number | string | null) {
  return useQuery<DriverTripsResult>({
    queryKey: ["drivers", "trips", id],
    enabled: id !== null && id !== undefined,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<DriverTripsResult>>(
        `/drivers/${id}/trips`
      );
      return data.data;
    },
  });
}

// --- Tenant companies (super admin only) -----------------------------------
// Platform-wide management of every tenant, distinct from the authenticated
// user's own-tenant self-service (useUpdateTenant below).
export const useTenantCompanies = (params?: ListParams) =>
  useList<TenantCompany>("tenants", params);
export const useTenantCompany = (id: number | null) =>
  useItem<TenantCompany>("tenants", id);
export const useCreateTenantCompany = () =>
  useCreate<TenantCompany, TenantCreatePayload>("tenants");
export const useUpdateTenantCompany = () =>
  useUpdate<TenantCompany, TenantUpdatePayload>("tenants");
export const useDeleteTenantCompany = () => useRemove("tenants");

// --- Routes ----------------------------------------------------------------
export const useRoutes = (params?: ListParams) => useList<Route>("routes", params);
export const useCreateRoute = () => useCreate<Route>("routes");

// --- Locations -------------------------------------------------------------
export const useLocations = (params?: ListParams) => useList<Location>("locations", params);
export const useCreateLocation = () => useCreate<Location>("locations");
export const useUpdateLocation = () => useUpdate<Location>("locations");

// Reference cities for a state — used to populate the location city dropdown.
export const useCities = (stateId?: number | string | null) =>
  useList<City>("cities", stateId ? { state_id: stateId } : {}, {
    enabled: !!stateId,
    staleTime: 1000 * 60 * 60,
  });

// --- Vehicle types / categories -------------------------------------------
export const useVehicleTypes = (params?: ListParams) =>
  useList<VehicleType>("vehicle-types", params);
export const useCreateVehicleType = () => useCreate<VehicleType>("vehicle-types");
export const useUpdateVehicleType = () => useUpdate<VehicleType>("vehicle-types");
export const useDeleteVehicleType = () => useRemove("vehicle-types");

export const useVehicleCategories = (params?: ListParams) =>
  useList<VehicleCategory>("vehicle-categories", params);
export const useCreateVehicleCategory = () => useCreate<VehicleCategory>("vehicle-categories");

// --- Seat arrangement types ------------------------------------------------
export const useSeatArrangementTypes = (params?: ListParams) =>
  useList<SeatArrangementType>("seat-arrangement-types", params);
export const useCreateSeatArrangementType = () =>
  useCreate<SeatArrangementType>("seat-arrangement-types");
// apiResource update accepts PUT.
export const useUpdateSeatArrangementType = () =>
  useUpdate<SeatArrangementType>("seat-arrangement-types", "put");
export const useDeleteSeatArrangementType = () => useRemove("seat-arrangement-types");

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
