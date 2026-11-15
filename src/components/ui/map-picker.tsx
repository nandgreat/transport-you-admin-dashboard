"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, X } from "lucide-react";
import { Input } from "@/components/ui/input";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface LatLng {
  lat: number;
  lng: number;
}

interface MapPickerProps {
  value: LatLng | null;
  onChange: (point: LatLng | null) => void;
  /** Called with a human-readable address when a place is chosen via search. */
  onResolveAddress?: (address: string) => void;
  disabled?: boolean;
}

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
// Default view (Abuja) when no point is set yet.
const DEFAULT_CENTER = { lat: 9.0765, lng: 7.3986 };

let loaderPromise: Promise<any> | null = null;

function loadGoogleMaps(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  const w = window as any;
  if (w.google?.maps?.places) return Promise.resolve(w.google);
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    const cbName = "__transportYouMapsReady";
    w[cbName] = () => resolve(w.google);
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}&libraries=places,marker&loading=async&callback=${cbName}`;
    script.async = true;
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
  return loaderPromise;
}

function formatCoord(n: number): string {
  return n.toFixed(6);
}

export function MapPicker({ value, onChange, onResolveAddress, disabled }: MapPickerProps) {
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  const mapDivRef = useRef<HTMLDivElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const lastPointRef = useRef<LatLng | null>(null);

  // Keep the latest callbacks without re-initialising the map.
  const onChangeRef = useRef(onChange);
  const onAddrRef = useRef(onResolveAddress);
  onChangeRef.current = onChange;
  onAddrRef.current = onResolveAddress;

  // Load the Google Maps script once (only when a key is configured).
  useEffect(() => {
    if (!KEY) return;
    let alive = true;
    loadGoogleMaps()
      .then(() => alive && setReady(true))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  // Initialise the map, marker and (new) Places search once the script is ready.
  useEffect(() => {
    if (!ready || !mapDivRef.current || mapRef.current) return;
    const g = (window as any).google;

    const map = new g.maps.Map(mapDivRef.current, {
      center: value ?? DEFAULT_CENTER,
      zoom: value ? 15 : 6,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    mapRef.current = map;

    const dropMarker = (lat: number, lng: number) => {
      if (!markerRef.current) {
        markerRef.current = new g.maps.Marker({ map, draggable: !disabled });
        markerRef.current.addListener("dragend", (e: any) => {
          const p = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          lastPointRef.current = p;
          onChangeRef.current(p);
        });
      }
      markerRef.current.setPosition({ lat, lng });
    };

    if (value) dropMarker(value.lat, value.lng);

    if (!disabled) {
      map.addListener("click", (e: any) => {
        const p = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        dropMarker(p.lat, p.lng);
        lastPointRef.current = p;
        onChangeRef.current(p);
      });
    }

    // Places API (New): the PlaceAutocompleteElement web component.
    const Pac = g.maps.places?.PlaceAutocompleteElement;
    if (Pac && searchBoxRef.current && !disabled) {
      try {
        const pac = new Pac({ includedRegionCodes: ["ng"] });
        pac.style.width = "100%";
        searchBoxRef.current.appendChild(pac);

        const useSelected = async (place: any) => {
          if (!place) return;
          try {
            await place.fetchFields({ fields: ["location", "formattedAddress"] });
          } catch {
            /* some builds pre-populate fields */
          }
          const loc = place.location;
          if (!loc) return;
          const p = { lat: loc.lat(), lng: loc.lng() };
          map.panTo(p);
          map.setZoom(16);
          dropMarker(p.lat, p.lng);
          lastPointRef.current = p;
          onChangeRef.current(p);
          const addr = place.formattedAddress;
          if (addr) onAddrRef.current?.(addr);
        };

        // Current API: gmp-select → event.placePrediction.toPlace().
        pac.addEventListener("gmp-select", async (ev: any) => {
          const place = ev?.placePrediction?.toPlace?.();
          await useSelected(place);
        });
        // Backwards compatibility with the earlier gmp-placeselect event.
        pac.addEventListener("gmp-placeselect", async (ev: any) => {
          await useSelected(ev?.place);
        });
      } catch {
        /* search is optional — map click/drag still works */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Reflect external value changes (prefill on edit, or Clear) onto the marker.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const g = (window as any).google;
    const last = lastPointRef.current;
    const same =
      value && last && Math.abs(last.lat - value.lat) < 1e-7 && Math.abs(last.lng - value.lng) < 1e-7;
    if (same) return;

    if (!value) {
      markerRef.current?.setMap(null);
      markerRef.current = null;
      lastPointRef.current = null;
      return;
    }
    if (!markerRef.current) {
      markerRef.current = new g.maps.Marker({ map: mapRef.current, draggable: !disabled });
      markerRef.current.addListener("dragend", (e: any) => {
        const p = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        lastPointRef.current = p;
        onChangeRef.current(p);
      });
    }
    markerRef.current.setPosition(value);
    mapRef.current.panTo(value);
    lastPointRef.current = value;
  }, [value, ready, disabled]);

  // Fallback: no key configured, or the script failed to load — manual entry.
  if (!KEY || failed) {
    return <ManualLatLng value={value} onChange={onChange} disabled={disabled} notConfigured={!KEY} />;
  }

  return (
    <div className="space-y-2">
      {/* The new PlaceAutocompleteElement renders its own input here. */}
      <div
        ref={searchBoxRef}
        className="min-h-10 [&_gmp-place-autocomplete]:w-full"
      >
        {!ready && (
          <Input disabled placeholder="Loading map…" />
        )}
      </div>

      <div
        ref={mapDivRef}
        className="h-56 w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
      />

      <div className="flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1.5 text-slate-500">
          <MapPin className="h-3.5 w-3.5 text-slate-400" />
          {value ? (
            <span className="font-medium text-slate-700">
              {formatCoord(value.lat)}, {formatCoord(value.lng)}
            </span>
          ) : (
            "Search, or click the map to drop a pin"
          )}
        </span>
        {value && !disabled && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex items-center gap-1 font-medium text-slate-500 hover:text-red-600"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>
    </div>
  );
}

// Manual lat/lng entry, used when Google Maps isn't available.
function ManualLatLng({
  value,
  onChange,
  disabled,
  notConfigured,
}: {
  value: LatLng | null;
  onChange: (p: LatLng | null) => void;
  disabled?: boolean;
  notConfigured?: boolean;
}) {
  const [lat, setLat] = useState(value?.lat != null ? String(value.lat) : "");
  const [lng, setLng] = useState(value?.lng != null ? String(value.lng) : "");

  useEffect(() => {
    setLat(value?.lat != null ? String(value.lat) : "");
    setLng(value?.lng != null ? String(value.lng) : "");
  }, [value?.lat, value?.lng]);

  const emit = (la: string, lo: string) => {
    const nlat = parseFloat(la);
    const nlng = parseFloat(lo);
    if (la.trim() && lo.trim() && Number.isFinite(nlat) && Number.isFinite(nlng)) {
      onChange({ lat: nlat, lng: nlng });
    } else if (!la.trim() && !lo.trim()) {
      onChange(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          type="number"
          step="any"
          placeholder="Latitude (9.0765)"
          value={lat}
          disabled={disabled}
          onChange={(e) => {
            setLat(e.target.value);
            emit(e.target.value, lng);
          }}
        />
        <Input
          type="number"
          step="any"
          placeholder="Longitude (7.3986)"
          value={lng}
          disabled={disabled}
          onChange={(e) => {
            setLng(e.target.value);
            emit(lat, e.target.value);
          }}
        />
      </div>
      {notConfigured && (
        <p className="text-xs text-slate-400">
          Set <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to
          pick the point on a map instead.
        </p>
      )}
    </div>
  );
}
