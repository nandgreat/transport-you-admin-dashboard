"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { toast } from "./toaster";
import { cn } from "@/lib/utils";

const ACCEPTED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_BYTES = 4 * 1024 * 1024; // 4MB

interface ImageUploadProps {
  /** URL of an already-saved image (edit mode). */
  existingUrl?: string | null;
  /** Currently-selected new file, if any. */
  file: File | null;
  onSelect: (file: File | null) => void;
  uploading?: boolean;
  className?: string;
}

export function ImageUpload({
  existingUrl,
  file,
  onSelect,
  uploading,
  className,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Build (and clean up) an object URL for the freshly-picked file.
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const shown = preview ?? existingUrl ?? null;

  const handleFiles = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    if (!ACCEPTED.includes(f.type)) {
      toast.error("Image must be a JPG, PNG or WEBP file.");
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error("Image must be 4MB or smaller.");
      return;
    }
    onSelect(f);
  };

  const clear = () => {
    onSelect(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {shown ? (
        <div className="relative w-full overflow-hidden rounded-lg border border-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shown} alt="Vehicle preview" className="h-40 w-full object-contain bg-slate-50" />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60">
              <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            </div>
          )}
          <div className="absolute right-2 top-2 flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-md bg-white/90 px-2 py-1 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-white"
            >
              Change
            </button>
            <button
              type="button"
              onClick={clear}
              className="rounded-md bg-white/90 p-1 text-slate-500 shadow-sm ring-1 ring-slate-200 hover:text-red-600"
              aria-label="Remove image"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 transition hover:border-brand-400 hover:text-brand-500"
        >
          <ImagePlus className="h-7 w-7" />
          <span className="text-sm font-medium">Upload image</span>
          <span className="text-xs">JPG, PNG or WEBP · max 4MB</span>
        </button>
      )}
    </div>
  );
}
