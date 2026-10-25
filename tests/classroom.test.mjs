import { describe, it, expect } from "vitest";
import {
  assertClassroomLocal,
  prepareClassroom,
  cleanupClassroom,
} from "../scripts/auth/classroom.mjs";
describe("disposable classroom tooling guards", () => {
  const local = {
    url: "http://127.0.0.1:54321",
    databaseUrl: "postgresql://postgres@127.0.0.1:54322/postgres",
  };
  it("accepts only loopback service and database targets", () => {
    expect(() => assertClassroomLocal(local)).not.toThrow();
    expect(() =>
      assertClassroomLocal({ ...local, url: "https://hosted.supabase.co" }),
    ).toThrow("refuses remote");
    expect(() =>
      assertClassroomLocal({
        ...local,
        databaseUrl: "postgresql://postgres@remote.invalid/postgres",
      }),
    ).toThrow("refuses remote");
  });
  it("requires explicit synthetic acknowledgement before opening connections", async () => {
    await expect(prepareClassroom(local)).rejects.toThrow("acknowledgement");
  });
  it("refuses preparation and cleanup of remote services before touching data", async () => {
    const remote = { ...local, url: "https://production.invalid" };
    await expect(
      prepareClassroom(remote, { acknowledged: true }),
    ).rejects.toThrow("refuses remote");
    await expect(cleanupClassroom(remote, {})).rejects.toThrow(
      "refuses remote",
    );
  });
});
