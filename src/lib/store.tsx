import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { z } from "zod";
import type {
  CompletedSession,
  LearningActivity,
  Language,
  MatchRequest,
  Role,
  Subject,
} from "../domain/types";
import { expireRequest } from "../domain/learning";
const storageKey = "village-vidya-fictional-demo-v1";
const savedSchema = z.object({
  grade: z.number().int().min(4).max(12),
  language: z.enum(["English", "हिन्दी", "मराठी", "తెలుగు"]),
  subject: z.enum(["Mathematics", "Science", "English", "Social Science"]),
  progress: z.record(z.string(), z.number().min(0).max(100)),
  saved: z.array(z.string()),
  available: z.boolean(),
  lowData: z.boolean(),
  goal: z.boolean(),
  approved: z.array(z.string()),
});
type SavedState = z.infer<typeof savedSchema>;
const defaults: SavedState = {
  grade: 8,
  language: "English",
  subject: "Mathematics",
  progress: {
    fractions: 50,
    equations: 25,
    photosynthesis: 0,
    tenses: 50,
    water: 0,
    panchayat: 0,
  },
  saved: [],
  available: true,
  lowData: true,
  goal: false,
  approved: [],
};
function initialState() {
  try {
    return savedSchema.parse(
      JSON.parse(localStorage.getItem(storageKey) || "null"),
    );
  } catch {
    return defaults;
  }
}
function initialSession(): { role: Role; expires: number } | null {
  try {
    const raw = JSON.parse(sessionStorage.getItem("vv-demo-role") || "null");
    return raw &&
      ["learner", "tutor", "guardian", "champion", "admin"].includes(
        raw.role,
      ) &&
      raw.expires > Date.now()
      ? raw
      : null;
  } catch {
    return null;
  }
}
interface AppStore {
  data: SavedState;
  role: Role | null;
  online: boolean;
  storageIssue: boolean;
  login: (role: Role) => void;
  logout: () => void;
  reset: () => void;
  setPreferences: (
    value: Partial<
      Pick<
        SavedState,
        "grade" | "language" | "subject" | "available" | "lowData" | "goal"
      >
    >,
  ) => void;
  saveLesson: (id: string) => void;
  completeLesson: (id: string, score: number) => void;
  requests: MatchRequest[];
  request: (
    tutorId: string,
    subject: Subject,
    topic: string,
    scheduled?: string,
  ) => MatchRequest;
  updateRequest: (id: string, status: MatchRequest["status"]) => void;
  completed: CompletedSession[];
  learningActivity: LearningActivity[];
  finishSession: (session: CompletedSession) => void;
  approve: (id: string) => void;
  toast: (message: string) => void;
  message: string;
}
const Context = createContext<AppStore | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(initialState);
  const [auth, setAuth] = useState(initialSession);
  const [online, setOnline] = useState(navigator.onLine);
  const [requests, setRequests] = useState<MatchRequest[]>([]);
  const [completed, setCompleted] = useState<CompletedSession[]>([]);
  const [learningActivity, setLearningActivity] = useState<LearningActivity[]>(
    [],
  );
  const [message, setMessage] = useState("");
  const [storageIssue, setStorageIssue] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch {
      setStorageIssue(true);
    }
  }, [data]);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  useEffect(() => {
    if (!auth) return;
    const t = setTimeout(
      () => {
        setAuth(null);
        setRequests([]);
        setCompleted([]);
        setLearningActivity([]);
        sessionStorage.removeItem("vv-demo-role");
        setMessage("Your demo session ended. Choose a profile to continue.");
      },
      Math.max(0, auth.expires - Date.now()),
    );
    return () => clearTimeout(t);
  }, [auth]);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 4500);
    return () => clearTimeout(t);
  }, [message]);
  useEffect(() => {
    const timer = setInterval(() => {
      setRequests((previous) => {
        const next = previous.map((r) => expireRequest(r, Date.now()));
        return next.some((r, i) => r !== previous[i]) ? next : previous;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  function login(role: Role) {
    const next = { role, expires: Date.now() + 15 * 60_000 };
    setAuth(next);
    try {
      sessionStorage.setItem("vv-demo-role", JSON.stringify(next));
    } catch {
      setStorageIssue(true);
    }
  }
  function logout() {
    setAuth(null);
    setRequests([]);
    setCompleted([]);
    setLearningActivity([]);
    try {
      sessionStorage.removeItem("vv-demo-role");
    } catch {
      /* Memory-only mode remains usable. */
    }
  }
  const value: AppStore = {
    data,
    role: auth?.role ?? null,
    online,
    storageIssue,
    login,
    logout,
    reset: () => {
      setData(defaults);
      setRequests([]);
      setCompleted([]);
      setLearningActivity([]);
      setMessage("The fictional demo has been reset.");
    },
    setPreferences: (v) => setData((p) => ({ ...p, ...v })),
    saveLesson: (id) =>
      setData((p) => ({
        ...p,
        saved: p.saved.includes(id)
          ? p.saved.filter((x) => x !== id)
          : [...p.saved, id],
      })),
    completeLesson: (id, score) => {
      const event = {
        id: crypto.randomUUID(),
        lessonId: id,
        at: Date.now(),
        score,
      };
      setLearningActivity((previous) => [event, ...previous].slice(0, 30));
      setData((p) => ({
        ...p,
        progress: { ...p.progress, [id]: Math.max(p.progress[id] || 0, score) },
      }));
    },
    learningActivity,
    requests,
    request: (tutorId, subject, topic, scheduled) => {
      const next: MatchRequest = {
        id: crypto.randomUUID(),
        tutorId,
        subject,
        topic,
        scheduled: scheduled ?? null,
        status: "pending",
        createdAt: Date.now(),
      };
      setRequests((p) => [...p.filter((r) => r.status !== "pending"), next]);
      return next;
    },
    updateRequest: (id, status) =>
      setRequests((p) =>
        p.map((r) =>
          r.id === id &&
          (r.status === "pending" ||
            (r.status === "accepted" && status === "cancelled"))
            ? { ...r, status }
            : r,
        ),
      ),
    completed,
    finishSession: (s) =>
      setCompleted((p) => (p.some((x) => x.id === s.id) ? p : [...p, s])),
    approve: (id) =>
      setData((p) => ({
        ...p,
        approved: p.approved.includes(id) ? p.approved : [...p.approved, id],
      })),
    toast: setMessage,
    message,
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useStore() {
  const value = useContext(Context);
  if (!value) throw new Error("StoreProvider is required");
  return value;
}
export const languageLabels: Record<
  Language,
  { hello: string; learn: string; tutors: string; home: string }
> = {
  English: {
    hello: "Good to see you",
    learn: "My learning",
    tutors: "Find a tutor",
    home: "Overview",
  },
  हिन्दी: {
    hello: "आपका स्वागत है",
    learn: "मेरी पढ़ाई",
    tutors: "साथी शिक्षक खोजें",
    home: "अवलोकन",
  },
  मराठी: {
    hello: "तुमचे स्वागत आहे",
    learn: "माझे शिक्षण",
    tutors: "शिक्षक शोधा",
    home: "आढावा",
  },
  తెలుగు: {
    hello: "స్వాగతం",
    learn: "నా అభ్యాసం",
    tutors: "బోధకుడిని కనుగొనండి",
    home: "అవలోకనం",
  },
};
