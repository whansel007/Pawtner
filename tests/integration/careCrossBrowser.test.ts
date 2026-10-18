import "dotenv/config";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client, Pool } from "pg";
import { createApiHandler } from "../../api/handlers.js";
import { PawtnerRepository } from "../../api/repository.js";

const databaseUrl = process.env.DATABASE_URL;
const testApi = describe.skipIf(!databaseUrl);
const migrationDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "migrations");
const A = "00000000-0000-4000-8000-000000000004"; // Fictional Tablet A
const B = "00000000-0000-4000-8000-000000000005"; // Fictional Tablet B

testApi("/care from any browser: refill requests, shared notes, BP sharing, demo clock (migration 008)", () => {
  let setup: Client;
  let pool: Pool;
  let schema: string;
  let handler: ReturnType<typeof createApiHandler>;

  beforeEach(async () => {
    schema = `pawtner_care_${process.pid}_${Date.now()}`;
    setup = new Client({ connectionString: databaseUrl });
    await setup.connect();
    await setup.query(`CREATE SCHEMA "${schema}"`);
    await setup.query(`SET search_path TO "${schema}", public`);
    for (const name of (await readdir(migrationDir)).filter((file) => /^\d+_.+\.sql$/.test(file)).sort()) {
      await setup.query(await readFile(join(migrationDir, name), "utf8"));
    }
    await setup.query(await readFile(join(migrationDir, "seed.sql"), "utf8"));
    pool = new Pool({ connectionString: databaseUrl, options: `-c search_path=${schema},public` });
    handler = createApiHandler(new PawtnerRepository(pool));
  });

  afterEach(async () => {
    await pool?.end();
    if (setup) {
      await setup.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await setup.end();
    }
  });

  const call = async (method: string, path: string, data?: unknown) => {
    const response = await handler(new Request(`http://localhost${path}`, {
      method, headers: { "content-type": "application/json" }, ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    }));
    return { status: response.status, body: await response.json() };
  };
  const summary = async () => (await call("GET", "/api/caretaker/summary")).body;
  const now = () => new Date().toISOString();

  it("refill requests: several medicines, one pending per medicine, name from medications, handled", async () => {
    const first = await call("POST", "/api/restock-requests", { medicationId: B, daysLeft: 4, requestedAt: now() });
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({ medicationId: B, medicationName: "Fictional Tablet B", daysLeft: 4, status: "pending", handledAt: null });
    expect(first.body.id).toMatch(/^[0-9a-f-]{36}$/);
    // Asking again for the same medicine replaces its pending request.
    const again = await call("POST", "/api/restock-requests", { medicationId: B, daysLeft: 3, requestedAt: now() });
    const other = await call("POST", "/api/restock-requests", { medicationId: A, daysLeft: 5, requestedAt: now() });
    const list = (await call("GET", "/api/restock-requests")).body.restockRequests;
    expect(list.map((item: { id: string }) => item.id).sort()).toEqual([again.body.id, other.body.id].sort());
    expect(list.find((item: { medicationId: string }) => item.medicationId === B).daysLeft).toBe(3);

    const handled = await call("POST", `/api/restock-requests/${again.body.id}/handled`);
    expect(handled.status).toBe(200);
    expect(handled.body.status).toBe("handled");
    expect(Number.isFinite(Date.parse(handled.body.handledAt))).toBe(true);
    // Repeating keeps the first time; a new request for B is allowed again (none pending).
    expect((await call("POST", `/api/restock-requests/${again.body.id}/handled`)).body.handledAt).toBe(handled.body.handledAt);
    expect((await call("POST", "/api/restock-requests", { medicationId: B, daysLeft: 2, requestedAt: now() })).status).toBe(201);
    expect((await call("GET", "/api/restock-requests")).body.restockRequests).toHaveLength(3);

    const caretaker = await summary();
    expect(caretaker.restockRequests).toHaveLength(3);
    expect(caretaker.restockRequests.every((item: { medicationName: string }) => item.medicationName.startsWith("Fictional Tablet"))).toBe(true);
  }, 60_000);

  it("refill requests: validation and ownership", async () => {
    expect((await call("POST", "/api/restock-requests", { medicationId: "00000000-0000-4000-8000-0000000000ff", daysLeft: 4, requestedAt: now() })).status).toBe(404);
    expect((await call("POST", "/api/restock-requests", { medicationId: "not-a-medicine", daysLeft: 4, requestedAt: now() })).status).toBe(404);
    expect((await call("POST", "/api/restock-requests", { medicationId: B, daysLeft: -1, requestedAt: now() })).status).toBe(400);
    expect((await call("POST", "/api/restock-requests", { medicationId: B, daysLeft: 2.5, requestedAt: now() })).status).toBe(400);
    expect((await call("POST", "/api/restock-requests", { medicationId: B, daysLeft: 4, requestedAt: "soon" })).status).toBe(400);
    expect((await call("POST", "/api/restock-requests/00000000-0000-4000-8000-0000000000ff/handled")).status).toBe(404);
    expect((await call("POST", "/api/restock-requests/bad%20id/handled")).status).toBe(400);
  });

  it("shared notes: upsert, replace, delete, length rules; only stored notes reach the summary", async () => {
    const id = "note-1";
    const created = await call("PUT", `/api/shared-notes/${id}`, { text: "  Ask about dizziness  ", updatedAt: "2026-10-18T01:00:00.000Z" });
    expect(created).toEqual({ status: 200, body: { id, text: "Ask about dizziness", updatedAt: "2026-10-18T01:00:00.000Z" } });
    await call("PUT", "/api/shared-notes/note-2", { text: "Second", updatedAt: "2026-10-18T02:00:00.000Z" });
    await call("PUT", `/api/shared-notes/${id}`, { text: "Ask about dizziness in the morning", updatedAt: "2026-10-18T03:00:00.000Z" });
    expect((await summary()).sharedNotes.map((note: { id: string; text: string }) => [note.id, note.text])).toEqual([
      [id, "Ask about dizziness in the morning"], ["note-2", "Second"],
    ]);
    expect((await call("DELETE", "/api/shared-notes/note-2")).body).toEqual({ deleted: true });
    expect((await call("DELETE", "/api/shared-notes/note-2")).body).toEqual({ deleted: false });
    expect((await summary()).sharedNotes).toHaveLength(1);

    expect((await call("PUT", `/api/shared-notes/${id}`, { text: "   ", updatedAt: now() })).status).toBe(400);
    expect((await call("PUT", `/api/shared-notes/${id}`, { text: "x".repeat(301), updatedAt: now() })).status).toBe(400);
    expect((await call("PUT", `/api/shared-notes/${id}`, { text: "x".repeat(300), updatedAt: now() })).status).toBe(200);
    expect((await call("PUT", `/api/shared-notes/${id}`, { text: "ok", updatedAt: "later" })).status).toBe(400);
  });

  it("BP sharing is enforced by the server", async () => {
    expect((await call("GET", "/api/sharing")).body).toEqual({ shareBloodPressure: true });
    await call("POST", "/api/health-metric", { systolic: 130, diastolic: 84, note: "Ask about my new tablet", recordedAt: now() });
    const shared = await summary();
    expect(shared.latestBloodPressure).not.toBeNull();
    expect(shared.doctorQuestions.length).toBeGreaterThan(0);

    expect((await call("PUT", "/api/sharing", { shareBloodPressure: false })).body).toEqual({ shareBloodPressure: false });
    const hidden = await summary();
    expect(hidden.latestBloodPressure).toBeNull();
    expect(hidden.doctorQuestions).toEqual([]);
    expect((await call("PUT", "/api/sharing", { shareBloodPressure: "no" })).status).toBe(400);
    await call("PUT", "/api/sharing", { shareBloodPressure: true });
    expect((await summary()).latestBloodPressure).not.toBeNull();
  }, 60_000);

  it("Reset to morning puts the four server copies back to the morning state (clock at the reset's morning time)", async () => {
    await call("POST", "/api/restock-requests", { medicationId: B, daysLeft: 4, requestedAt: now() });
    await call("PUT", "/api/shared-notes/note-1", { text: "Shared", updatedAt: now() });
    await call("PUT", "/api/sharing", { shareBloodPressure: false });
    await call("PUT", "/api/demo-clock", { at: "2026-10-19T01:00:00.000Z" });
    const morning = new Date(Date.now() - 60_000).toISOString();
    expect((await call("POST", "/api/demo/reset-day", { now: morning })).status).toBe(200);
    expect((await call("GET", "/api/restock-requests")).body.restockRequests).toEqual([]);
    expect((await summary()).sharedNotes).toEqual([]);
    expect((await call("GET", "/api/sharing")).body).toEqual({ shareBloodPressure: true });
    const clock = Date.parse((await call("GET", "/api/demo-clock")).body.at);
    expect(clock - Date.parse(morning)).toBeGreaterThanOrEqual(0);
    expect(clock - Date.parse(morning)).toBeLessThan(5_000);
  }, 60_000);

  it("demo clock: set, runs forward from when it was set, cleared", async () => {
    expect((await call("GET", "/api/demo-clock")).body).toEqual({ at: null });
    const at = "2026-10-19T01:00:00.000Z";
    const set = await call("PUT", "/api/demo-clock", { at });
    expect(Date.parse(set.body.at) - Date.parse(at)).toBeGreaterThanOrEqual(0);
    expect(Date.parse(set.body.at) - Date.parse(at)).toBeLessThan(5_000);
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const later = (await call("GET", "/api/demo-clock")).body.at;
    expect(Date.parse(later) - Date.parse(at)).toBeGreaterThanOrEqual(1000);
    expect((await call("PUT", "/api/demo-clock", { at: null })).body).toEqual({ at: null });
    expect((await call("PUT", "/api/demo-clock", { at: "noon" })).status).toBe(400);
    expect((await call("PUT", "/api/demo-clock", {})).status).toBe(400);
  });
});
