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

testApi("GET /api/health-metrics: her readings of the last days for the blood-pressure log", () => {
  let setup: Client;
  let pool: Pool;
  let schema: string;
  let handler: ReturnType<typeof createApiHandler>;

  beforeEach(async () => {
    schema = `pawtner_bplog_${process.pid}_${Date.now()}`;
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
  const log = async (systolic: number, diastolic: number, recordedAt: string, note: string | null = null) =>
    expect((await call("POST", "/api/health-metric", { systolic, diastolic, note, recordedAt })).status).toBe(201);
  const list = async (now: string, days?: number) =>
    call("GET", `/api/health-metrics?now=${encodeURIComponent(now)}${days === undefined ? "" : `&days=${days}`}`);
  /** Our own readings only (the seed's readings are older history). */
  const ours = (items: Array<{ systolic: number }>) => items.filter((item) => [141, 142, 143, 144].includes(item.systolic));

  it("readings from 3 days, newest first, with her note; a reading hidden by Reset to morning is skipped", async () => {
    await log(141, 81, sgt(shift(today, -2), "09:00"), "I feel fine");
    await log(142, 82, sgt(shift(today, -1), "09:00"));
    await log(143, 83, sgt(today, "08:30"), "Feeling a bit dizzy");
    let body = (await list(sgt(today, "12:00"))).body;
    expect(ours(body.healthMetrics).map((m: { systolic: number }) => m.systolic)).toEqual([143, 142, 141]);
    expect(body.healthMetrics[0]).toMatchObject({ systolic: 143, diastolic: 83, note: "Feeling a bit dizzy", kind: "blood_pressure" });
    expect(Object.keys(body.healthMetrics[0]).sort()).toEqual(["diastolic", "id", "kind", "note", "recordedAt", "systolic"]);
    // Reset to morning hides today's reading (never deletes it); earlier days stay.
    expect((await call("POST", "/api/demo/reset-day", { now: sgt(today, "09:00") })).status).toBe(200);
    body = (await list(sgt(today, "12:00"))).body;
    expect(ours(body.healthMetrics).map((m: { systolic: number }) => m.systolic)).toEqual([142, 141]);
    expect((await setup.query(`SELECT count(*)::int AS n FROM "${schema}".health_metrics WHERE systolic = 143`)).rows[0].n).toBe(1);
  });

  it("only the last `days` days (default 30) and nothing after `now`", async () => {
    await log(141, 81, sgt(shift(today, -31), "09:00"));
    await log(142, 82, sgt(shift(today, -29), "09:00"));
    await log(144, 84, sgt(shift(today, 1), "09:00")); // a demo clock dated tomorrow
    const all = ours((await list(sgt(today, "12:00"))).body.healthMetrics).map((m: { systolic: number }) => m.systolic);
    expect(all).toEqual([142]);
    expect(ours((await list(sgt(today, "12:00"), 7)).body.healthMetrics)).toEqual([]);
    for (const bad of [0, 367, 1.5]) expect((await list(sgt(today, "12:00"), bad)).status).toBe(400);
  });

  it("only her readings, never another user's", async () => {
    await setup.query(`INSERT INTO "${schema}".users (id, name, created_at) VALUES ('00000000-0000-4000-8000-0000000000ff', 'Other person', now() + interval '1 day')`);
    await setup.query(
      `INSERT INTO "${schema}".health_metrics (id, user_id, kind, systolic, diastolic, note, recorded_at)
       VALUES (gen_random_uuid(), '00000000-0000-4000-8000-0000000000ff', 'blood_pressure', 199, 99, 'not hers', $1)`,
      [sgt(today, "10:00")],
    );
    await log(143, 83, sgt(today, "09:30"));
    const items = (await list(sgt(today, "12:00"))).body.healthMetrics;
    expect(items.some((m: { systolic: number }) => m.systolic === 199)).toBe(false);
    expect(items.some((m: { systolic: number }) => m.systolic === 143)).toBe(true);
  });
});
