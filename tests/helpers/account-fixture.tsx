import { vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  createClient,
  type AuthChangeEvent,
  type Session,
  type User,
} from "@supabase/supabase-js";
import type { Database } from "../../src/lib/data-access/database.types";
import type { Role } from "../../src/domain/types";
import { AccountProvider, type RealAccess } from "../../src/lib/auth/provider";
import { AppRoutes } from "../../src/app-routes";
import { StoreProvider } from "../../src/lib/store";
const id = "00000000-0000-0000-0000-000000000001";
export function setupAccount(role: Role = "tutor", restored = true) {
  const user = {
    id,
    email: "adult@example.invalid",
    email_confirmed_at: "2026-10-24T00:00:00Z",
    app_metadata: {},
    user_metadata: { role: "admin" },
    aud: "authenticated",
    created_at: "2026-10-24T00:00:00Z",
  } as User;
  const session: Session = {
    access_token: "test-access",
    refresh_token: "test-refresh",
    expires_in: 900,
    expires_at: Date.now() / 1000 + 900,
    token_type: "bearer",
    user,
  };
  let current: Session | null = restored ? session : null;
  let enabled = true;
  const listeners = new Set<
    (event: AuthChangeEvent, session: Session | null) => void
  >();
  const data: Record<string, unknown> = {
    profiles: {
      id,
      display_name: "Adult account owner",
      preferred_language: "English",
      created_at: "",
      updated_at: "",
    },
    user_roles: [{ role }],
    adult_test_accounts: { enabled: true },
    learner_profiles:
      role === "learner"
        ? {
            user_id: id,
            required_role: "learner",
            created_at: "",
            updated_at: "",
          }
        : null,
    tutor_profiles:
      role === "tutor"
        ? {
            user_id: id,
            required_role: "tutor",
            academic_grade: 12,
            revision: 1,
            discovery_preview_enabled: false,
            discovery_preview_id: "90000000-0000-4000-8000-000000000001",
            bio: "",
            teaching_skill_score: null,
            completed_sessions: 0,
            created_at: "",
            updated_at: "",
          }
        : null,
    guardian_relationships: [],
  };
  const fetcher: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    const table = new URL(request.url).pathname.split("/").at(-1)!;
    return new Response(
      JSON.stringify(
        table === "adult_test_accounts" ? { enabled } : data[table],
      ),
      { headers: { "Content-Type": "application/json" } },
    );
  };
  const client = createClient<Database>(
    "https://test.supabase.co",
    "sb_publishable_test_auth_public_key",
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: crypto.randomUUID(),
      },
      global: { fetch: fetcher },
    },
  );
  vi.spyOn(client.auth, "getSession").mockImplementation(async () =>
    current
      ? { data: { session: current }, error: null }
      : { data: { session: null }, error: null },
  );
  vi.spyOn(client.auth, "getUser").mockImplementation(async () => ({
    data: { user },
    error: null,
  }));
  vi.spyOn(client.auth, "onAuthStateChange").mockImplementation((callback) => {
    listeners.add(callback);
    return {
      data: {
        subscription: {
          id: "fixture",
          callback,
          unsubscribe: () => {
            listeners.delete(callback);
          },
        },
      },
    };
  });
  vi.spyOn(client.auth, "signInWithPassword").mockImplementation(async () => {
    current = session;
    listeners.forEach((fn) => fn("SIGNED_IN", session));
    return { data: { user, session }, error: null };
  });
  vi.spyOn(client.auth, "signOut").mockImplementation(async () => {
    current = null;
    listeners.forEach((fn) => fn("SIGNED_OUT", null));
    return { error: null };
  });
  vi.spyOn(client.auth, "resetPasswordForEmail").mockResolvedValue({
    data: {},
    error: null,
  });
  vi.spyOn(client.auth, "updateUser").mockResolvedValue({
    data: { user },
    error: null,
  });
  const access: RealAccess = {
    mode: "supabase",
    client,
    curriculum: {
      load: vi.fn().mockResolvedValue({
        boards: [],
        grades: [],
        subjects: [],
        chapters: [],
        lessons: [],
        assessments: [],
      }),
    },
    tutor: {
      load: vi.fn().mockImplementation(async () => ({
        profile: data.tutor_profiles,
        availability: [],
        subjects: [],
        languages: [],
        verification: [],
      })),
      saveBio: vi.fn(),
      setDiscoveryPreview: vi.fn(),
      saveAvailability: vi.fn(),
      deleteAvailability: vi.fn(),
    },
    discovery: { search: vi.fn() },
    learner: {
      progress: vi.fn().mockResolvedValue([]),
      bookmarks: vi.fn().mockResolvedValue([]),
      attempts: vi.fn().mockResolvedValue([]),
      enrollments: vi.fn().mockResolvedValue([]),
      activity: vi.fn().mockResolvedValue([]),
      recordReading: vi.fn(),
      setBookmark: vi.fn(),
      enroll: vi.fn(),
    },
  };
  return {
    access,
    data,
    session,
    emit: (event: AuthChangeEvent, value: Session | null = session) => {
      current = value;
      listeners.forEach((fn) => fn(event, value));
    },
    disable: () => {
      enabled = false;
    },
  };
}
export function openAccount(access: RealAccess, route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <StoreProvider>
        <AccountProvider access={access}>
          <AppRoutes />
        </AccountProvider>
      </StoreProvider>
    </MemoryRouter>,
  );
}
