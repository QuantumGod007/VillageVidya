import { useCallback, useEffect, useRef, useState } from "react";
import type { RealAccess } from "../auth/provider";
import type { TrustSnapshot } from "./trust-repository";
import type { CurriculumCatalog } from "../../domain/curriculum";
export function useTrustWorkspace(
  access: RealAccess,
  query: string,
  viewKey: string,
) {
  const [data, setData] = useState<
    (TrustSnapshot & { catalog: CurriculumCatalog }) | null
  >(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [pending, setPending] = useState("");
  const generation = useRef(0),
    lifetime = useRef(0),
    locked = useRef(false);
  const previousView = useRef(viewKey);
  const reload = useCallback(async () => {
    const req = ++generation.current;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const [records, catalog] = await Promise.all([
        access.trust.load(query),
        access.curriculum.load(),
      ]);
      if (req !== generation.current) return false;
      setData({ ...records, catalog });
      return true;
    } catch (e) {
      if (req === generation.current) {
        setData(null);
        setError(
          e instanceof Error
            ? e.message
            : "Trust records could not be loaded. Check your connection and role, then retry.",
        );
      }
      return false;
    } finally {
      if (req === generation.current) setLoading(false);
    }
  }, [access, query]);
  const invalidate = useCallback(() => {
    ++generation.current;
    ++lifetime.current;
    locked.current = false;
  }, []);
  useEffect(() => {
    void reload();
    const refresh = () => {
      if (!locked.current) void reload();
    };
    const offline = () => {
      ++generation.current;
      setData(null);
      setLoading(false);
      setError(
        "You’re offline. Reconnect to verify current access and decision state.",
      );
    };
    const timer = setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    window.addEventListener("offline", offline);
    return () => {
      invalidate();
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", offline);
    };
  }, [reload, invalidate]);
  useEffect(() => {
    if (previousView.current === viewKey) return;
    previousView.current = viewKey;
    // Hash navigation keeps this workspace mounted. Recheck records rather
    // than showing a prior section's snapshot until the next polling tick.
    // A pending mutation already owns the lock and reloads before completing.
    if (!locked.current) void reload();
  }, [viewKey, reload]);
  async function mutate(
    key: string,
    op: () => Promise<unknown>,
    success: string,
  ) {
    if (locked.current) return false;
    locked.current = true;
    const current = lifetime.current;
    ++generation.current;
    setPending(key);
    setError("");
    setNotice("");
    try {
      await op();
      if (current !== lifetime.current) return false;
      const ok = await reload();
      if (ok && current === lifetime.current) setNotice(success);
      return ok;
    } catch (e) {
      if (current === lifetime.current) {
        setData(null);
        setError(
          `${e instanceof Error ? e.message : "The operation could not be confirmed."} Refresh to check the authoritative state before retrying.`,
        );
      }
      return false;
    } finally {
      if (current === lifetime.current) {
        locked.current = false;
        setPending("");
      }
    }
  }
  return { data, loading, error, notice, pending, reload, mutate };
}
