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

const B = "00000000-0000-4000-8000-000000000005"; // Fictional Tablet B
const A_SCHEDULE = "00000000-0000-4000-8000-000000000006"; // Fictional Tablet A, 10:00
const TABLES = ["dose_events", "health_metrics", "agent_decisions", "walk_sessions"] as const;
// The seed writes its history relative to today in Rose's zone (Asia/Singapore), so the test does too.
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore" }).format(new Date());
const sgt = (date: string, time: string) => new Date(`${date}T${time}:00+08:00`).toISOString();
const shift = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
const DAY_START = sgt(today, "00:00");
const MORNING = sgt(today, "09:00");
const A_DUE = sgt(today, "10:00");

/** Decision ids change with every decide; everything else must match. */
function withoutIds(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutIds);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).filter(([key]) => key !== "id").map(([key, item]) => [key, withoutIds(item)]));
  }
  return value;
}

testApi("Reset to morning hides the day, never deletes it", () => {
  let setup: Client;
  let pool: Pool;
  let schema: string;
  let handler: ReturnType<typeof createApiHandler>;

  beforeEach(async () => {
    schema = `pawtner_reset_${process.pid}_${Date.now()}`;
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
  const get = async (path: string, now: string) => (await call("GET", `${path}?now=${encodeURIComponent(now)}`)).body;
  const reset = async (now = MORNING) => expect((await call("POST", "/api/demo/reset-day", { now })).status).toBe(200);
  const decide = async (now: string) => {
    const { user } = await get("/api/today", now);
    return (await call("POST", "/api/agent/decide", { userId: user.id, now })).body.decision;
  };
  const takeA = (at: string) => call("POST", "/api/dose-event", { scheduleId: A_SCHEDULE, scheduledFor: A_DUE, event: "taken", occurredAt: at, proofPhotoUrl: null });
  /** What the phone and /care see at `at` (the reset's morning, or later that day). */
  const view = async (at = MORNING) => withoutIds({
    today: await get("/api/today", at),
    summary: await get("/api/caretaker/summary", at),
    restock: await get("/api/restock-requests", at),
  });
  const LATE = sgt(today, "13:30");
  const counts = async () => Object.fromEntries(await Promise.all(TABLES.map(async (table) =>
    [table, (await setup.query(`SELECT count(*)::int AS n FROM "${schema}".${table}`)).rows[0].n] as const)));
  /** Every stamped row: table, id, stamp, and the row's time that the reset scoped by. */
  const stamps = async () => (await setup.query(
    `SELECT 'dose_events' AS t, id::text, reset_at, scheduled_for AS at FROM "${schema}".dose_events WHERE reset_at IS NOT NULL
     UNION ALL SELECT 'health_metrics', id::text, reset_at, recorded_at FROM "${schema}".health_metrics WHERE reset_at IS NOT NULL
     UNION ALL SELECT 'agent_decisions', id::text, reset_at, created_at FROM "${schema}".agent_decisions WHERE reset_at IS NOT NULL
     UNION ALL SELECT 'walk_sessions', id::text, reset_at, finished_at FROM "${schema}".walk_sessions WHERE reset_at IS NOT NULL
     ORDER BY 1, 2`,
  )).rows.map((row) => ({ table: row.t as string, id: row.id as string, resetAt: (row.reset_at as Date).toISOString(), at: (row.at as Date).toISOString() }));
  const jsonbLists = async () => (await setup.query(`SELECT restock_requests, shared_visit_notes FROM "${schema}".users`)).rows[0];
  /** A dose, a nudge (two), a reading with a note, a walk, a refill request and a shared note, all today after 9:00. */
  const doTheDay = async () => {
    expect((await decide(sgt(today, "11:05"))).ruleId).toBe("dose_nudge_1");
    expect((await decide(sgt(today, "12:10"))).ruleId).toBe("dose_nudge_2");
    expect((await takeA(sgt(today, "12:15"))).status).toBe(201);
    expect((await call("POST", "/api/health-metric", { systolic: 150, diastolic: 88, note: "Ask about dizziness", recordedAt: sgt(today, "12:20") })).status).toBe(201);
    expect((await call("POST", "/api/walk-session", { startedAt: sgt(today, "12:30"), finishedAt: sgt(today, "12:50"), distanceMeters: 900, fastStretchOccurred: false })).status).toBe(201);
    expect((await call("POST", "/api/restock-requests", { medicationId: B, daysLeft: 3, requestedAt: sgt(today, "13:00") })).status).toBe(201);
    expect((await call("PUT", "/api/shared-notes/note-today", { text: "Ask about the new tablet", updatedAt: sgt(today, "13:05") })).status).toBe(200);
  };

  it("(a) the morning comes back exactly and every row stays", async () => {
    await reset();
    const before = await view();
    const beforeLate = await view(LATE);
    await doTheDay();
    const afterActions = await counts();
    const dayView = (await get("/api/today", sgt(today, "13:30")));
    expect(dayView.activities).toMatchObject({ medicines: false, bloodPressure: true, walk: true });
    expect(await view(LATE)).not.toEqual(beforeLate);
    await reset();
    expect(await view()).toEqual(before);
    expect(await view(LATE)).toEqual(beforeLate);
    // Nothing deleted: the same rows, plus the reset's own decision at 9:00.
    expect(await counts()).toEqual({ ...afterActions, agent_decisions: afterActions.agent_decisions + 1 });
    const stamped = await stamps();
    expect(stamped.filter((row) => row.table === "dose_events")).toHaveLength(1);
    expect(stamped.filter((row) => row.table === "health_metrics")).toHaveLength(1);
    expect(stamped.filter((row) => row.table === "walk_sessions")).toHaveLength(1);
    // The first reset's 9:00 decision, both nudges and the decisions after the dose, reading and walk.
    expect(stamped.filter((row) => row.table === "agent_decisions").length).toBeGreaterThanOrEqual(6);
    const lists = await jsonbLists();
    expect(lists.restock_requests).toHaveLength(1);
    expect(lists.restock_requests[0].resetAt).toBeTruthy();
    expect(lists.shared_visit_notes).toHaveLength(1);
    expect(lists.shared_visit_notes[0].resetAt).toBeTruthy();
  }, 60_000);

  it("(b) after a reset the same dose counts once and the nudge cap starts again", async () => {
    await reset();
    await doTheDay();
    await reset();
    expect((await decide(sgt(today, "11:05"))).ruleId).toBe("dose_nudge_1");
    expect((await takeA(sgt(today, "11:10"))).status).toBe(201);
    const { doses } = await get("/api/today", sgt(today, "11:30"));
    const a = doses.find((dose: { id: string; scheduledAt: string }) => dose.id === A_SCHEDULE && dose.scheduledAt === A_DUE);
    expect(a).toMatchObject({ status: "taken", nudgeCount: 1 });
    const visible = await setup.query(
      `SELECT count(*)::int AS n FROM "${schema}".dose_events WHERE schedule_id = $1 AND scheduled_for = $2 AND reset_at IS NULL`, [A_SCHEDULE, A_DUE]);
    expect(visible.rows[0].n).toBe(1);
  }, 60_000);

  it("(c) a second reset keeps the first reset's stamps", async () => {
    await reset();
    await doTheDay();
    await reset();
    const first = await stamps();
    const firstLists = await jsonbLists();
    await reset();
    const second = await stamps();
    // Every row the first reset stamped keeps its stamp; only the second reset's own 9:00 decision is new.
    for (const row of first) expect(second).toContainEqual(row);
    expect(second.length).toBe(first.length + 1);
    expect(await jsonbLists()).toEqual(firstLists);
  }, 60_000);

  it("(d) yesterday's rows and items are never stamped", async () => {
    const yesterday = shift(today, -1);
    await setup.query(
      `UPDATE "${schema}".users SET restock_requests = $1::jsonb, shared_visit_notes = $2::jsonb`,
      [JSON.stringify([{ id: "r-old", medicationId: B, daysLeft: 5, requestedAt: sgt(yesterday, "18:00"), status: "handled", handledAt: sgt(yesterday, "19:00") }]),
        JSON.stringify([{ id: "note-old", text: "From yesterday", updatedAt: sgt(yesterday, "23:59") }])],
    );
    expect((await call("POST", "/api/health-metric", { systolic: 140, diastolic: 85, note: null, recordedAt: sgt(yesterday, "23:59") })).status).toBe(201);
    await reset();
    await doTheDay();
    await reset();
    const stamped = await stamps();
    expect(stamped.length).toBeGreaterThan(0);
    for (const row of stamped) expect(Date.parse(row.at)).toBeGreaterThanOrEqual(Date.parse(DAY_START));
    const restock = (await get("/api/restock-requests", MORNING)).restockRequests;
    expect(restock.map((item: { id: string }) => item.id)).toEqual(["r-old"]);
    expect(restock[0]).not.toHaveProperty("resetAt");
    const summary = await get("/api/caretaker/summary", MORNING);
    expect(summary.sharedNotes).toEqual([{ id: "note-old", text: "From yesterday", updatedAt: sgt(yesterday, "23:59") }]);
    expect(summary.restockRequests.map((item: { id: string }) => item.id)).toEqual(["r-old"]);
    // Writes keep hidden items: a new request for B and an edit of today's (hidden) note id.
    expect((await call("POST", "/api/restock-requests", { medicationId: B, daysLeft: 2, requestedAt: sgt(today, "14:00") })).status).toBe(201);
    expect((await call("PUT", "/api/shared-notes/note-today", { text: "Again", updatedAt: sgt(today, "14:05") })).status).toBe(200);
    const lists = await jsonbLists();
    expect(lists.restock_requests).toHaveLength(3); // r-old, today's hidden one (kept, not replaced), the new one
    expect(lists.restock_requests.filter((item: { resetAt?: string }) => item.resetAt)).toHaveLength(1);
    expect(lists.shared_visit_notes.filter((item: { id: string }) => item.id === "note-today")).toHaveLength(2);
  }, 60_000);

  it("(e) a row a demo clock dated tomorrow is stamped too", async () => {
    const tomorrow = sgt(shift(today, 1), "09:30");
    expect((await call("POST", "/api/health-metric", { systolic: 135, diastolic: 82, note: null, recordedAt: tomorrow })).status).toBe(201);
    await reset();
    const stamped = await stamps();
    expect(stamped).toContainEqual(expect.objectContaining({ table: "health_metrics", at: tomorrow }));
    const { healthMetrics } = await get("/api/today", tomorrow);
    expect(healthMetrics).toEqual([]);
  }, 60_000);
});
