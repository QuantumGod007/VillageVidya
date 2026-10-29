import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ActorBookingRepository,
  BookingSnapshot,
} from "./booking-repository";
export function useBookings(
  repository: ActorBookingRepository,
  recordId: string | null,
  viewKey: string,
) {
  const [data, setData] = useState<BookingSnapshot | null>(null),
    [loading, setLoading] = useState(true),
    [pending, setPending] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const generation = useRef(0),
    lifetime = useRef(0),
    lock = useRef(false),
    snapshot = useRef<BookingSnapshot | null>(null),
    lastRead = useRef(0);
  const reload = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const result = await repository.load(recordId);
      if (current !== generation.current) return false;
      snapshot.current = result;
      lastRead.current = performance.now();
      setData(result);
      return true;
    } catch (e) {
      if (current === generation.current) {
        snapshot.current = null;
        setData(null);
        setError(
          e instanceof Error
            ? e.message
            : "Booking records could not be loaded.",
        );
      }
      return false;
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [repository, recordId]);
  const invalidate = useCallback(() => {
    ++generation.current;
    ++lifetime.current;
    lock.current = false;
  }, []);
  useEffect(() => {
    void reload();
    const refresh = () => {
      if (!lock.current && document.visibilityState !== "hidden") void reload();
    };
    const offline = () => {
      ++generation.current;
      snapshot.current = null;
      setData(null);
      setLoading(false);
      setError(
        "You’re offline. Reconnect to verify current requests and sessions.",
      );
    };
    const timer = setInterval(() => {
      const d = snapshot.current;
      if (
        d &&
        (d.requests.some((r) => r.status === "pending" || r.can_fallback) ||
          (d.sessions.some(
            (s) => s.status === "scheduled" || s.status === "active",
          ) &&
            performance.now() - lastRead.current >= 15_000))
      )
        refresh();
    }, 5_000);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    window.addEventListener("offline", offline);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      invalidate();
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", offline);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [reload, viewKey, invalidate]);
  async function mutate(key: string, op: () => Promise<string>) {
    if (lock.current) return null;
    lock.current = true;
    const life = lifetime.current;
    ++generation.current;
    setPending(key);
    setError("");
    setNotice("");
    try {
      const result = await op();
      if (life !== lifetime.current) return null;
      if (!(await reload()) || life !== lifetime.current) return null;
      setNotice(
        "Server action recorded. Current request and session records are shown below.",
      );
      return result;
    } catch (e) {
      if (life === lifetime.current) {
        snapshot.current = null;
        setData(null);
        setError(
          `${e instanceof Error ? e.message : "Action could not be confirmed."} Refresh to check server state before retrying.`,
        );
      }
      return null;
    } finally {
      if (life === lifetime.current) {
        lock.current = false;
        setPending("");
      }
    }
  }
  return { data, loading, pending, error, notice, reload, mutate };
}
