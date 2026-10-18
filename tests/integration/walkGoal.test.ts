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
const START = sgt(today, "09:00");
const plus = (minutes: number) => new Date(Date.parse(START) + minutes * 60_000).toISOString();

testApi("Walk goal: a walk earns the heart when it lasts its own goal (migration 010)", () => {
  let setup: Client;
  let pool: Pool;
  let schema: string;
  let handler: ReturnType<typeof createApiHandler>;

  beforeEach(async () => {
    schema = `pawtner_walk_${process.pid}_${Date.now()}`;
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
  /** A walk from `from` to `to` minutes after 9:00 today. */
  const walkBetween = (from: number, to: number, goalMinutes?: number | null) => call("POST", "/api/walk-session", {
    startedAt: plus(from), finishedAt: plus(to), distanceMeters: 500, fastStretchOccurred: false, ...(goalMinutes === undefined ? {} : { goalMinutes }),
  });
  const walk = (minutes: number, goalMinutes?: number | null) => walkBetween(0, minutes, goalMinutes);
  const walkedAt = async (minutes: number) => (await get("/api/today", plus(minutes))).activities.walk as boolean;

  it("goal 30: one 29-minute walk earns nothing, one 30-minute walk earns the heart", async () => {
    expect((await walk(29, 30)).status).toBe(201);
    expect(await walkedAt(29)).toBe(false);
  });

  it("goal 30: a 30-minute walk earns the heart (+1)", async () => {
    const heartBefore = (await get("/api/today", plus(0))).dog.heart;
    expect((await walk(30, 30)).status).toBe(201);
    expect(await walkedAt(30)).toBe(true);
    expect((await get("/api/today", plus(30))).dog.heart).toBe(heartBefore + 1);
  });

  it("goal 100 needs 100 minutes in one walk", async () => {
    await walk(99, 100);
    expect(await walkedAt(99)).toBe(false);
  });

  it("stop and continue: 20 + 30 minutes with goal 50 earn the heart at the second walk's finish", async () => {
    await walkBetween(0, 20, 50);
    expect(await walkedAt(25)).toBe(false);
    await walkBetween(60, 90, 50);
    expect(await walkedAt(89)).toBe(false);
    expect(await walkedAt(90)).toBe(true);
  });

  it("20 + 20 minutes with goal 50 earn nothing", async () => {
    await walkBetween(0, 20, 50);
    await walkBetween(60, 80, 50);
    expect(await walkedAt(120)).toBe(false);
  });

  it("Buddy celebrates a walk only when it earned the day's walk heart", async () => {
    // No refill reminder in the way (throwaway schema only).
    await setup.query(`UPDATE "${schema}".medications SET days_of_supply = NULL`);
    expect((await walkBetween(0, 20, 50)).body.decision.decision).not.toBe("celebrate");
    const earned = (await walkBetween(60, 90, 50)).body.decision;
    expect(earned).toMatchObject({ decision: "celebrate", observations: { walkFinished: true } });
  });

  it("a walk with no goal (older phone, or saved before goals) still counts at any length", async () => {
    await walk(1);
    expect(await walkedAt(1)).toBe(true);
    const row = (await setup.query(`SELECT goal_minutes FROM "${schema}".walk_sessions WHERE started_at = $1`, [START])).rows[0];
    expect(row.goal_minutes).toBeNull();
  });

  it("goalMinutes must be a whole number from 1 to 600", async () => {
    for (const bad of [0, 601, 1.5, "50"]) expect((await walk(60, bad as number)).status).toBe(400);
    expect((await walk(60, null)).status).toBe(201);
    expect((await walk(60, 600)).status).toBe(201);
  });

  it("past hearts are unchanged: the seed's walks have no goal, and a short walk today never touches earlier days", async () => {
    const seedGoals = (await setup.query(`SELECT count(*)::int AS n FROM "${schema}".walk_sessions WHERE goal_minutes IS NOT NULL`)).rows[0].n;
    expect(seedGoals).toBe(0);
    const past = async () => {
      const summary = await get("/api/caretaker/summary", plus(10));
      const yesterday = await get("/api/today", sgt(shift(today, -1), "21:00"));
      return { dayHearts: summary.dayHearts, yesterday: yesterday.dog };
    };
    const before = await past();
    await walk(5, 50);
    await walkBetween(10, 60, 50);
    expect(await past()).toEqual(before);
  });
});
