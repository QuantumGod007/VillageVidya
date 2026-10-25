import { useCallback, useEffect, useRef, useState } from "react";
import type { RealAccess } from "../auth/provider";
import type { DiscoveryFilters, DiscoveryResult } from "./discovery-repository";
export function useTutorDiscovery(
  access: RealAccess,
  filters: DiscoveryFilters | null,
) {
  const [data, setData] = useState<DiscoveryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const invalidate = useCallback(() => {
    ++generation.current;
    clearTimeout(timer.current);
  }, []);
  const reload = useCallback(async () => {
    invalidate();
    const request = generation.current;
    setData(null);
    setError("");
    if (!filters) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const started = performance.now();
    try {
      const result = await access.discovery.search(filters);
      if (request !== generation.current) return;
      const remaining =
        Math.min(
          60_000,
          Date.parse(result.expires_at) - Date.parse(result.as_of),
        ) -
        (performance.now() - started);
      if (!Number.isFinite(remaining) || remaining <= 0)
        throw new Error(
          "This preview expired before it arrived. Retry for current records.",
        );
      setData(result);
      timer.current = setTimeout(() => {
        void reload();
      }, remaining);
    } catch (e) {
      if (request === generation.current)
        setError(
          e instanceof Error
            ? e.message
            : "Discovery could not be loaded. Retry when connected.",
        );
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [access, filters, invalidate]);
  useEffect(() => {
    void reload();
    const refresh = () => {
      void reload();
    };
    const offline = () => {
      invalidate();
      setData(null);
      setLoading(false);
      setError(
        "You’re offline. Reconnect to verify current tutor eligibility; private results are not saved offline.",
      );
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    window.addEventListener("offline", offline);
    return () => {
      invalidate();
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", offline);
    };
  }, [reload, invalidate]);
  return { data, loading, error, reload };
}
