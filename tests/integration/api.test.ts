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
    // The seed's history is relative to the day it runs; this test uses fixed 13 Oct times, so start
    // from an empty history on that day (only inside this throwaway test schema).
    await setup.query(`DELETE FROM "${schema}".dose_events; DELETE FROM "${schema}".health_metrics;
      UPDATE "${schema}".med_schedules SET starts_on = '2026-10-13'`);
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
    const now = "2026-10-13T23:00:00+08:00";
    const todayResponse = await handler(new Request(`http://localhost/api/today?now=${encodeURIComponent(now)}`));
    expect(todayResponse.status).toBe(200);
    const today = await todayResponse.json();
    expect(today).toMatchObject({ user: { name: "Rose" }, dog: { name: "Buddy" } });
    expect(today.doses.length).toBeGreaterThan(0);

    const settingsResponse = await handler(new Request("http://localhost/api/escalation-settings"));
    expect(await settingsResponse.json()).toEqual({ optedIn: true, threshold: 2 });
    const invalidSettings = await handler(new Request("http://localhost/api/escalation-settings", {
      method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ optedIn: true, threshold: 1 }),
    }));
    expect(invalidSettings.status).toBe(400);
    const updatedSettings = await handler(new Request("http://localhost/api/escalation-settings", {
      method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ optedIn: false, threshold: 3 }),
    }));
    expect(await updatedSettings.json()).toEqual({ optedIn: false, threshold: 3 });
    await handler(new Request("http://localhost/api/escalation-settings", {
      method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ optedIn: true, threshold: 2 }),
    }));

    const decideAt = async (time: string) => handler(new Request("http://localhost/api/agent/decide", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: today.user.id, now: time }),
    }));
    const firstNudge = await decideAt("2026-10-13T11:01:00+08:00");
    expect((await firstNudge.json()).decision).toMatchObject({ decision: "nudge", ruleId: "dose_nudge_1" });
    const secondNudge = await decideAt("2026-10-13T12:01:00+08:00");
    expect((await secondNudge.json()).decision).toMatchObject({ decision: "nudge", ruleId: "dose_nudge_2" });
    const afterNudgeLimit = await decideAt("2026-10-13T13:01:00+08:00");
    expect((await afterNudgeLimit.json()).decision.decision).toBe("restock_reminder");
    const decisionLogResponse = await handler(new Request(`http://localhost/api/today?now=${encodeURIComponent("2026-10-13T13:01:00+08:00")}`));
    expect((await decisionLogResponse.json()).latestDecision).toMatchObject({ decision: "restock_reminder", wordingSource: "template" });

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
  }, 60_000);
});
