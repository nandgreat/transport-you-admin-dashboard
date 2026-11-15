"use client";

import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { MapPicker, type LatLng } from "@/components/ui/map-picker";
import { toast } from "@/components/ui/toaster";
import { apiErrorMessage } from "@/lib/axios";
import {
  useCreateLocation,
  useUpdateLocation,
  useStates,
  useCities,
} from "@/hooks/resources";
import type { Location } from "@/types/api";

const schema = z
  .object({
    state_id: z.string().min(1, "State is required"),
    city: z.string().min(1, "City is required"),
    name: z.string().optional(),
    address: z.string().min(1, "Address is required"),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
    status: z.enum(["active", "inactive"]).optional(),
  })
  .superRefine((v, ctx) => {
    const hasLat = !!v.latitude?.trim();
    const hasLng = !!v.longitude?.trim();
    // A map point needs both coordinates.
    if (hasLat !== hasLng) {
      ctx.addIssue({
        code: "custom",
        path: [hasLat ? "longitude" : "latitude"],
        message: "Provide both latitude and longitude",
      });
    }
    if (hasLat) {
      const n = Number(v.latitude);
      if (Number.isNaN(n) || n < -90 || n > 90)
        ctx.addIssue({ code: "custom", path: ["latitude"], message: "Must be between -90 and 90" });
    }
    if (hasLng) {
      const n = Number(v.longitude);
      if (Number.isNaN(n) || n < -180 || n > 180)
        ctx.addIssue({ code: "custom", path: ["longitude"], message: "Must be between -180 and 180" });
    }
  });

type FormValues = z.infer<typeof schema>;

export function LocationFormModal({
  open,
  onClose,
  location,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  location?: Location | null;
  /** Called with the new location after a successful create. */
  onCreated?: (location: Location) => void;
}) {
  const isEdit = !!location;
  const create = useCreateLocation();
  const update = useUpdateLocation();
  const states = useStates();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const stateId = watch("state_id");
  const cities = useCities(stateId || null);
  const cityItems = cities.data?.items ?? [];

  const stateOptions = useMemo(
    () => (states.data?.items ?? []).map((s) => ({ value: String(s.id), label: s.name })),
    [states.data?.items]
  );
  const cityOptions = useMemo(
    () => cityItems.map((c) => ({ value: c.name, label: c.name })),
    [cityItems]
  );

  // Prefill on open (edit) or clear (create).
  useEffect(() => {
    if (!open) return;
    reset({
      state_id: location?.state_id ? String(location.state_id) : "",
      city: location?.city ?? "",
      name: location?.name ?? "",
      address: location?.address ?? "",
      latitude: location?.latitude != null ? String(location.latitude) : "",
      longitude: location?.longitude != null ? String(location.longitude) : "",
      status: undefined,
    });
  }, [open, location, reset]);

  // When the state changes, drop a city that doesn't belong to the new state.
  // Guarded so the prefilled city survives while its state's cities load.
  useEffect(() => {
    if (cityItems.length === 0) return;
    const current = getValues("city");
    if (current && !cityItems.some((c) => c.name === current)) {
      setValue("city", "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateId, cities.data?.items]);

  // The current geolocation point, derived from the lat/lng form fields.
  const latVal = watch("latitude");
  const lngVal = watch("longitude");
  const point = useMemo<LatLng | null>(() => {
    const la = latVal?.trim() ? Number(latVal) : NaN;
    const lo = lngVal?.trim() ? Number(lngVal) : NaN;
    return Number.isFinite(la) && Number.isFinite(lo) ? { lat: la, lng: lo } : null;
  }, [latVal, lngVal]);

  const busy = create.isPending || update.isPending;

  const geoPayload = (v: FormValues) =>
    v.latitude?.trim() && v.longitude?.trim()
      ? { latitude: Number(v.latitude), longitude: Number(v.longitude) }
      : {};

  const submit = (v: FormValues) => {
    if (isEdit && location) {
      update.mutate(
        {
          id: location.id,
          body: {
            state_id: Number(v.state_id),
            city: v.city,
            name: v.name?.trim() || v.city,
            address: v.address,
            ...geoPayload(v),
            ...(v.status ? { status: v.status } : {}),
          },
        },
        {
          onSuccess: () => {
            toast.success("Location updated");
            onClose();
          },
          onError: (e) => toast.error(apiErrorMessage(e, "Could not update location")),
        }
      );
    } else {
      create.mutate(
        {
          state_id: Number(v.state_id),
          city: v.city,
          // Omit name when blank so the API defaults it to the city.
          ...(v.name?.trim() ? { name: v.name.trim() } : {}),
          address: v.address,
          ...geoPayload(v),
        },
        {
          onSuccess: (created) => {
            toast.success("Location added");
            reset();
            onCreated?.(created);
            onClose();
          },
          onError: (e) => toast.error(apiErrorMessage(e, "Could not add location")),
        }
      );
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit location" : "Add location"}
      description="Register a terminal or pickup point. Pick the city, then name the stop."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(submit)} loading={busy}>
            {isEdit ? "Save changes" : "Add location"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        {/* City selection first: state scopes the city dropdown. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="State" required error={errors.state_id?.message}>
            <Controller
              control={control}
              name="state_id"
              render={({ field }) => (
                <Combobox
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={stateOptions}
                  placeholder="Select state…"
                  searchPlaceholder="Search states…"
                  loading={states.isLoading}
                  invalid={!!errors.state_id}
                />
              )}
            />
          </Field>
          <Field
            label="City"
            required
            error={errors.city?.message}
            hint={
              !stateId
                ? "Select a state first"
                : cities.isLoading
                ? "Loading cities…"
                : cityOptions.length === 0
                ? "No cities listed for this state"
                : undefined
            }
          >
            <Controller
              control={control}
              name="city"
              render={({ field }) => (
                <Combobox
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={cityOptions}
                  placeholder="Select city…"
                  searchPlaceholder="Search cities…"
                  emptyText="No cities listed for this state"
                  disabled={!stateId}
                  loading={!!stateId && cities.isLoading}
                  invalid={!!errors.city}
                />
              )}
            />
          </Field>
        </div>

        <Field
          label="Location name"
          error={errors.name?.message}
          hint="Optional — defaults to the city name if left blank."
        >
          <Input placeholder="Jabi Motor Park" {...register("name")} />
        </Field>

        <Field label="Address" required error={errors.address?.message}>
          <Input placeholder="Opposite Jabi Lake Mall, Bala Sokoto Way" {...register("address")} />
        </Field>

        <div>
          <p className="mb-2 text-xs font-medium text-slate-500">
            Station location point <span className="font-normal text-slate-400">(optional)</span>
          </p>
          <MapPicker
            value={point}
            onChange={(p) => {
              setValue("latitude", p ? String(p.lat) : "", { shouldValidate: true });
              setValue("longitude", p ? String(p.lng) : "", { shouldValidate: true });
            }}
            onResolveAddress={(addr) => {
              // Fill the address from the searched place only when it's empty.
              if (!getValues("address")?.trim()) {
                setValue("address", addr, { shouldValidate: true });
              }
            }}
          />
          {(errors.latitude || errors.longitude) && (
            <p className="mt-1 text-xs font-medium text-red-500">
              {errors.latitude?.message || errors.longitude?.message}
            </p>
          )}
        </div>

        {isEdit && (
          <Field label="Status" hint="Leave unchanged to keep the current status.">
            <Select {...register("status")}>
              <option value="">No change</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
        )}
      </form>
    </Modal>
  );
}
