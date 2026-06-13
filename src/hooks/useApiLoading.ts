"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MIN_LOADING_MS = 1000;

/** Tracks in-flight API calls and keeps the loader visible for at least {@link MIN_LOADING_MS}. */
export function useApiLoading() {
  const pendingRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const safeSetIsLoading = useCallback((value: boolean) => {
    if (mountedRef.current) setIsLoading(value);
  }, []);

  const withLoading = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    pendingRef.current += 1;

    if (pendingRef.current === 1) {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      startedAtRef.current = Date.now();
      safeSetIsLoading(true);
    }

    try {
      return await fn();
    } finally {
      pendingRef.current = Math.max(0, pendingRef.current - 1);

      if (pendingRef.current === 0) {
        const startedAt = startedAtRef.current ?? Date.now();
        const remaining = Math.max(0, MIN_LOADING_MS - (Date.now() - startedAt));

        if (remaining > 0) {
          hideTimerRef.current = setTimeout(() => {
            hideTimerRef.current = null;
            startedAtRef.current = null;
            safeSetIsLoading(false);
          }, remaining);
        } else {
          startedAtRef.current = null;
          safeSetIsLoading(false);
        }
      }
    }
  }, [safeSetIsLoading]);

  return {
    isLoading,
    withLoading,
  };
}
