import "dotenv/config";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client, Pool } from "pg";
import { createApiHandler } from "../../api/handlers.js";
import { PawtnerRepository } from "../../api/repository.js";

const databaseUrl = process.env.DATABASE_URL;
const testApi = describe.skipIf(!databaseUrl);
const here = dirname(fileURLToPath(import.meta.url));

testApi("HTTP handlers persist events and return the shared response contract", () => {
  let setup: Client;
  let pool: Pool;
  let schema: string;
  let handler: ReturnType<typeof createApiHandler>;

  beforeEach(async () => {
    schema = `pawtner_api_${process.pid}_${Date.now()}`;
    setup = new Client({ connectionString: databaseUrl });
    await setup.connect();
    await setup.query(`CREATE SCHEMA "${schema}"`);
    await setup.query(`SET search_path TO "${schema}", public`);
    await setup.query(await readFile(join(here, "..", "..", "migrations", "001_init.sql"), "utf8"));
    await setup.query(await readFile(join(here, "..", "..", "migrations", "seed.sql"), "utf8"));
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

  it("serves today and records a deterministic emergency reading and dose event", async () => {
    const now = "2026-10-14T15:00:00+08:00";
    const todayResponse = await handler(new Request(`http://localhost/api/today?now=${encodeURIComponent(now)}`));
    expect(todayResponse.status).toBe(200);
    const today = await todayResponse.json();
    expect(today).toMatchObject({ user: { name: "Siew Lan" }, dog: { name: "Max" } });
    expect(today.doses.length).toBeGreaterThan(0);

    const healthResponse = await handler(new Request("http://localhost/api/health-metric", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ systolic: 185, diastolic: 120, note: "bad headache", recordedAt: now }),
    }));
    expect(healthResponse.status).toBe(201);
    const health = await healthResponse.json();
    expect(health.decision).toMatchObject({ decision: "emergency_995", wordingSource: "template" });

    const dose = today.doses[0];
    const eventResponse = await handler(new Request("http://localhost/api/dose-event", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ scheduleId: dose.id, scheduledFor: dose.scheduledAt, event: "taken", occurredAt: now }),
    }));
    expect(eventResponse.status).toBe(201);
    const event = await eventResponse.json();
    expect(event).toMatchObject({ event: { scheduleId: dose.id, event: "taken" }, today: { doses: expect.any(Array) } });
  }, 30_000);
});
