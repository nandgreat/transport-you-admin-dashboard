"use client";

import { useEffect, useState } from "react";

// Reads a boolean query flag (e.g. ?new=1) on mount without needing a
// Suspense boundary. Client-only, so no SSR bailout concerns.
export function useQueryFlag(key: string): boolean {
  const [value, setValue] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get(key)) setValue(true);
  }, [key]);
  return value;
}
