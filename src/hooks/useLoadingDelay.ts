"use client";

import { useState, useEffect } from "react";

/**
 * Hook to implement NFR-05: Show loading state only if interaction takes > 300ms.
 * Prevents flickering for fast API responses.
 * 
 * @param isLoading The primary loading state (e.g., from TanStack Query or local state)
 * @param delayMs The delay in milliseconds before showing the loader (default: 300ms)
 * @returns boolean true if we should show the loading state
 */
export function useLoadingDelay(isLoading: boolean, delayMs: number = 300): boolean {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (isLoading) {
      // Start a timer to show loading after delay
      timer = setTimeout(() => {
        setShouldShow(true);
      }, delayMs);
    } else {
      // If loading stops, reset immediately
      setShouldShow(false);
      if (timer) clearTimeout(timer);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isLoading, delayMs]);

  return shouldShow;
}
