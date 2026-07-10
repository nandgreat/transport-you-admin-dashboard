"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import api from "@/lib/axios";
import type { ApiResponse, Paginated } from "@/types/api";

// Some list endpoints return a Laravel paginator, others a plain array.
// Normalise both into a consistent { items, meta } shape.
export interface ListResult<T> {
  items: T[];
  meta: {
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
  } | null;
}

function normaliseList<T>(payload: Paginated<T> | T[]): ListResult<T> {
  if (Array.isArray(payload)) {
    return { items: payload, meta: null };
  }
  return {
    items: payload.data ?? [],
    meta: {
      current_page: payload.current_page,
      last_page: payload.last_page,
      total: payload.total,
      per_page: payload.per_page,
    },
  };
}

export type ListParams = Record<string, string | number | boolean | undefined>;

export function useList<T>(
  resource: string,
  params: ListParams = {},
  options?: Partial<UseQueryOptions<ListResult<T>>>
) {
  return useQuery<ListResult<T>>({
    queryKey: [resource, "list", params],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Paginated<T> | T[]>>(`/${resource}`, {
        params,
      });
      return normaliseList<T>(data.data);
    },
    ...options,
  });
}

export function useItem<T>(resource: string, id: number | string | null) {
  return useQuery<T>({
    queryKey: [resource, "item", id],
    enabled: id !== null && id !== undefined,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<T>>(`/${resource}/${id}`);
      return data.data;
    },
  });
}

export function useCreate<T, TBody = Record<string, unknown>>(resource: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: TBody) => {
      const { data } = await api.post<ApiResponse<T>>(`/${resource}`, body);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [resource] }),
  });
}

export function useUpdate<T, TBody = Record<string, unknown>>(
  resource: string,
  method: "patch" | "put" = "patch"
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: number | string; body: TBody }) => {
      const { data } = await api[method]<ApiResponse<T>>(`/${resource}/${id}`, body);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [resource] }),
  });
}

export function useRemove(resource: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number | string) => {
      await api.delete(`/${resource}/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [resource] }),
  });
}
