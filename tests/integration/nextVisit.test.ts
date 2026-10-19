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
// The seed writes its history relative to today in Rose's zone (Asia/Singapore), so the test does too.
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore" }).format(new Date());
const sgt = (date: string, time: string) => new Date(`${date}T${time}:00+08:00`).toISOString();
const shift = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

testApi("Next visit date: side-effect notes count until the doctor's next visit (migration 011)", () => {
  let setup: Client;
  let pool: Pool;
  let schema: string;
  let handler: ReturnType<typeof createApiHandler>;

  beforeEach(async () => {
    schema = `pawtner_visit_${process.pid}_${Date.now()}`;
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
  const note = (recordedAt: string, text: string) => call("POST", "/api/health-metric", { systolic: 140, diastolic: 85, note: text, recordedAt });
  const setVisit = (date: string | null) => call("PUT", "/api/next-visit", { date });
  const decideAt = async (now: string) => {
    const { user } = await get("/api/today", now);
    return (await call("POST", "/api/agent/decide", { userId: user.id, now })).body.decision.decision as string;
  };
  // 09:30: Tablet A (10:00) isn't late yet, so no nudge comes before the side-effect rule.
  const AT = (date: string) => sgt(date, "09:30");

  it("saves, reads and clears the date; rejects anything that isn't a calendar date; Reset to morning keeps it", async () => {
    expect((await call("GET", "/api/next-visit")).body).toEqual({ date: null, lastVisit: null });
    expect((await setVisit(shift(today, 3))).body).toEqual({ date: shift(today, 3), lastVisit: null });
    for (const bad of ["2026-02-30", "tomorrow", "2026-10-25T09:00"]) expect((await setVisit(bad)).status).toBe(400);
    expect((await call("POST", "/api/demo/reset-day", { now: sgt(today, "09:00") })).status).toBe(200);
    expect((await call("GET", "/api/next-visit")).body).toEqual({ date: shift(today, 3), lastVisit: null });
    expect((await setVisit(null)).body).toEqual({ date: null, lastVisit: null });
  });

  it("a 'dizzy' note 3 days before the visit still shows the card and the agent asks; the day after the visit it doesn't", async () => {
    expect((await note(sgt(shift(today, -3), "09:00"), "Feeling a bit dizzy")).status).toBe(201);
    await setVisit(today);
    expect((await get("/api/today", AT(today))).sideEffectNote).toBe(true);
    expect(await decideAt(AT(today))).toBe("doctor_question");
    const after = shift(today, 1);
    expect((await get("/api/today", AT(after))).sideEffectNote).toBe(false);
    expect(await decideAt(AT(after))).not.toBe("doctor_question");
  });

  it("no date, or a date that has passed: only today's note counts", async () => {
    await note(sgt(shift(today, -3), "09:00"), "Feeling a bit dizzy");
    expect((await get("/api/today", AT(today))).sideEffectNote).toBe(false);
    await setVisit(shift(today, -5));
    expect((await get("/api/today", AT(today))).sideEffectNote).toBe(false);
    await note(sgt(today, "09:10"), "sleepy this morning");
    expect((await get("/api/today", AT(today))).sideEffectNote).toBe(true);
    expect((await get("/api/today", AT(shift(today, 1)))).sideEffectNote).toBe(false);
  });

  it("two dates: a passed next date becomes the last visit; notes from before it never count again", async () => {
    const setAt = (date: string | null) => call("PUT", `/api/next-visit?now=${encodeURIComponent(AT(today))}`, { date });
    await note(sgt(shift(today, -14), "09:00"), "Feeling a bit dizzy"); // discussed at the visit 5 days ago
    expect((await setAt(shift(today, -5))).body).toEqual({ date: shift(today, -5), lastVisit: null });
    // Today the next visit is set to two weeks ahead: the passed date becomes the last visit.
    expect((await setAt(shift(today, 14))).body).toEqual({ date: shift(today, 14), lastVisit: shift(today, -5) });
    expect((await get("/api/today", AT(today))).sideEffectNote).toBe(false);
    expect(await decideAt(AT(today))).not.toBe("doctor_question");
    // A new note after the last visit counts until the next visit.
    await note(sgt(shift(today, -3), "09:00"), "sleepy after lunch");
    expect((await get("/api/today", AT(today))).sideEffectNote).toBe(true);
    expect((await get("/api/today", AT(shift(today, 14)))).sideEffectNote).toBe(true);
    expect((await get("/api/today", AT(shift(today, 15)))).sideEffectNote).toBe(false);
    // Rescheduling the future date, clearing it and Reset to morning keep the last visit.
    expect((await setAt(shift(today, 20))).body.lastVisit).toBe(shift(today, -5));
    expect((await setAt(null)).body).toEqual({ date: null, lastVisit: shift(today, -5) });
    expect((await call("POST", "/api/demo/reset-day", { now: sgt(today, "09:00") })).status).toBe(200);
    expect((await call("GET", "/api/next-visit")).body.lastVisit).toBe(shift(today, -5));
  });

  it("past hearts, streak and lifetime hearts don't change with the date", async () => {
    const past = async () => {
      const summary = await get("/api/caretaker/summary", AT(today));
      const days = [];
      for (const d of [-6, -3, -1]) days.push((await get("/api/today", sgt(shift(today, d), "21:00"))).dog);
      return { dayHearts: summary.dayHearts, days };
    };
    const before = await past();
    await setVisit(shift(today, 10));
    expect(await past()).toEqual(before);
  });
});
