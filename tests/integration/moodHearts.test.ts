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

testApi("Mood and streak have one source (neutral is neutral; /api/milestones follows /api/today)", () => {
  let setup: Client;
  let pool: Pool;
  let schema: string;
  let handler: ReturnType<typeof createApiHandler>;

  beforeEach(async () => {
    schema = `pawtner_mood_${process.pid}_${Date.now()}`;
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

  it("3 hearts and a late dose: the write's nudge leaves Buddy content, not sad", async () => {
    // Tablet A is due 10:00; at 11:05 it is 65 minutes late, so the next write makes a dose nudge.
    const saved = await call("POST", "/api/health-metric", { systolic: 130, diastolic: 80, note: null, recordedAt: sgt(today, "11:05") });
    expect(saved.status).toBe(201);
    expect(saved.body.decision.decision).toBe("nudge");
    const { dog, latestDecision } = await get("/api/today", sgt(today, "11:06"));
    expect(latestDecision.decision).toBe("nudge");
    expect(dog.heart).toBe(3);
    expect(dog.mood).toBe("content");
    expect((await get("/api/caretaker/summary", sgt(today, "11:06"))).dog.mood).toBe("content");
  });

  it("1 heart (hearts faded) → the sad face", async () => {
    const { dog } = await get("/api/today", sgt(shift(today, 2), "09:00"));
    expect(dog.heart).toBe(1);
    expect(dog.mood).toBe("sleepy");
  });

  it("/api/milestones uses the same streak as /api/today, also right after a day changes and after a write", async () => {
    await call("POST", "/api/health-metric", { systolic: 130, diastolic: 80, note: null, recordedAt: sgt(today, "11:05") });
    for (const at of [sgt(today, "11:06"), sgt(today, "23:59"), sgt(shift(today, 1), "00:05"), sgt(shift(today, 2), "09:00")]) {
      const streak = (await get("/api/today", at)).dog.streak;
      const milestones = await get("/api/milestones", at);
      expect(milestones.streak).toBe(streak);
      const wave = milestones.tricks.find((trick: { name: string }) => trick.name === "Wave");
      expect(wave.earned).toBe(streak >= 7);
    }
  });
});
