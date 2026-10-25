import { useCallback, useEffect, useRef, useState } from "react";
import type { RealAccess } from "../auth/provider";
import type { TutorSnapshot } from "./tutor-repository";
import type { CurriculumCatalog } from "../../domain/curriculum";
export function useTutorWorkspace(access: RealAccess) {
  const [data, setData] = useState<
    (TutorSnapshot & { catalog: CurriculumCatalog }) | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState("");
  const generation = useRef(0);
  const lifetime = useRef(0);
  const locked = useRef(false);
  const reload = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const [records, catalog] = await Promise.all([
        access.tutor.load(),
        access.curriculum.load(),
      ]);
      if (request !== generation.current) return false;
      setData({ ...records, catalog });
      return true;
    } catch {
      if (request === generation.current)
        setError(
          "We couldn’t refresh your tutor records. Check your connection and session, then retry. Any earlier view is the last confirmed server state.",
        );
      return false;
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [access]);
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
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    return () => {
      invalidate();
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [reload, invalidate]);
  async function mutate(
    key: string,
    operation: () => Promise<void>,
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
      await operation();
      if (current !== lifetime.current) return false;
      const confirmed = await reload();
      if (confirmed && current === lifetime.current) setNotice(success);
      return confirmed;
    } catch (e) {
      if (current === lifetime.current)
        setError(
          `${e instanceof Error ? e.message : "Your change could not be confirmed."} Refresh records to check the server state before retrying.`,
        );
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
