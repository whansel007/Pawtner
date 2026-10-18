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

const A = "00000000-0000-4000-8000-000000000004"; // Fictional Tablet A, 10:00
const B = "00000000-0000-4000-8000-000000000005"; // Fictional Tablet B, 20:00
const A_SCHEDULE = "00000000-0000-4000-8000-000000000006";
// The seed writes its history relative to today in Rose's zone (Asia/Singapore), so the test does too.
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore" }).format(new Date());
const sgt = (date: string, time: string) => new Date(`${date}T${time}:00+08:00`).toISOString();
const shift = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
const NOW = sgt(today, "15:00");
const STOP = sgt(today, "14:00");
// Past instants: earlier days, and earlier today before the stop.
const PAST = [sgt(shift(today, -3), "15:00"), sgt(shift(today, -1), "09:00"), sgt(shift(today, -1), "21:00"), sgt(today, "11:00"), sgt(today, "13:59")];

testApi("A stop is a moment: it never rewrites the past", () => {
  let setup: Client;
  let pool: Pool;
  let schema: string;
  let handler: ReturnType<typeof createApiHandler>;

  beforeEach(async () => {
    schema = `pawtner_stop_${process.pid}_${Date.now()}`;
    setup = new Client({ connectionString: databaseUrl });
    await setup.connect();
    await setup.query(`CREATE SCHEMA "${schema}"`);
    await setup.query(`SET search_path TO "${schema}", public`);
    for (const name of (await readdir(migrationDir)).filter((file) => /^\d+_.+\.sql$/.test(file)).sort()) {
      await setup.query(await readFile(join(migrationDir, name), "utf8"));
    }
    await setup.query(await readFile(join(migrationDir, "seed.sql"), "utf8"));
    // Today: Tablet A taken at 10:05 (only inside this throwaway schema); B is due at 20:00.
    await setup.query(
      `INSERT INTO "${schema}".dose_events (id, schedule_id, scheduled_for, event, occurred_at) VALUES (gen_random_uuid(), $1, $2, 'taken', $3)`,
      [A_SCHEDULE, sgt(today, "10:00"), sgt(today, "10:05")],
    );
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

  const get = async (path: string, now: string) => (await handler(new Request(`http://localhost${path}?now=${encodeURIComponent(now)}`))).json();
  const stopAt = async (id: string, at: string) => {
    const response = await handler(new Request(`http://localhost/api/medications/${id}`, {
      method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ active: false }),
    }));
    expect(response.status).toBe(200);
    // Pin the stop moment so the test doesn't depend on the clock (throwaway schema only).
    await setup.query(`UPDATE "${schema}".medications SET stopped_at = $2 WHERE id = $1`, [id, at]);
  };
  const undo = (id: string) => handler(new Request(`http://localhost/api/medications/${id}`, {
    method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ active: true }),
  }));
  /** Everything about the past: the 7 day-end hearts, plus hearts, streak and lifetime at each past instant. */
  const snapshot = async () => {
    const summary = await get("/api/caretaker/summary", NOW);
    const past = [];
    for (const instant of PAST) {
      const { dog } = await get("/api/today", instant);
      past.push({ instant, heart: dog.heart, streak: dog.streak, heartsTotal: dog.heartsTotal });
    }
    const { dog, doses } = await get("/api/today", NOW);
    return { dayHearts: summary.dayHearts, past, now: dog, doses: doses.map((dose: { medicationId: string }) => dose.medicationId) };
  };

  it("stopping Tablet B keeps every past number, and earns today's medicine heart at the stop, not before", async () => {
    const baseline = await snapshot();
    await stopAt(B, STOP);
    const stopped = await snapshot();
    expect(stopped.dayHearts).toEqual(baseline.dayHearts);
    expect(stopped.past).toEqual(baseline.past);
    expect(stopped.now.streak).toBe(baseline.now.streak);
    // B was the only dose left today: the day is complete from the stop (14:00), so one heart more than at 13:59.
    const before = baseline.past.at(-1)!.heart;
    expect((await get("/api/today", sgt(today, "13:59"))).dog.heart).toBe(before);
    expect((await get("/api/today", STOP)).dog.heart).toBe(Math.min(4, before + 1));
    // B is no longer on today's list.
    expect(stopped.doses).not.toContain(B);
    expect(baseline.doses).toContain(B);

    // Undo straight after = as if never stopped.
    expect((await undo(B)).status).toBe(200);
    expect(await snapshot()).toEqual(baseline);
  }, 120_000);

  it("stopping every medicine keeps every past number; today's earlier dose still counts, but isn't listed", async () => {
    const baseline = await snapshot();
    await stopAt(A, STOP);
    await stopAt(B, STOP);
    const stopped = await snapshot();
    expect(stopped.dayHearts).toEqual(baseline.dayHearts);
    expect(stopped.past).toEqual(baseline.past);
    expect(stopped.now.streak).toBe(baseline.now.streak);
    expect(stopped.doses).toEqual([]);
    // A's 10:00 dose (taken) still counts: today's medicines are done, from the stop.
    expect((await get("/api/today", NOW)).activities.medicines).toBe(true);

    expect((await undo(A)).status).toBe(200);
    expect((await undo(B)).status).toBe(200);
    expect(await snapshot()).toEqual(baseline);
  }, 120_000);
});
